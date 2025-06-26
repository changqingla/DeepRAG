"""
文件上传 API 模块
提供用于上传、下载、管理文件的 RESTful API 接口
"""
import os
import logging
from dotenv import load_dotenv
import io
import uuid
import json
import time
import mimetypes
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, redirect, send_file
from flask_cors import CORS  # 导入 CORS 支持
import werkzeug
import tempfile
import io
import mimetypes
import uuid
from datetime import datetime
from minio import Minio
from minio.error import S3Error
from minio.commonconfig import REPLACE, CopySource
from generate import login_and_get_auth_header, create_api_key_with_auth_header

import logging

# 导入自定义模块
from minio_config import (
    init_minio_client, # New Initializer
    minio_client,      # Global client, direct use if needed or use functions below
    bucket_name,       # Global bucket name
    ensure_bucket_exists, # Ensure this uses global client
    upload_file_to_minio,
    get_file_url,
    delete_file_from_minio,
    # list_files_in_minio, # This was imported from minio_config but not used in file_api
    # DEFAULT_BUCKET_NAME # No longer needed directly here
    # 以下函数应该从 db_utils 导入，而不是 minio_config
    # update_folder,
    # update_file,
    # get_folder_by_id
)
from db_utils import (
    init_db_connection_pool, # New Initializer
    generate_uuid, # This is a utility, keep it
    insert_folder,
    update_folder,
    get_folders,
    get_folder_by_id, # Make sure this and others use the global pool implicitly
    delete_folder,
    insert_file,
    update_file,
    get_files,
    get_file_by_id,
    delete_file
)

# Configure logging (can be done once here)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize MinIO Client and DB Connection Pool
# These should be called once when the application starts.
logging.info("正在初始化 MinIO 客户端...")
minio_init_success = init_minio_client() 
logging.info("正在初始化数据库连接池...")
init_db_connection_pool()

# Ensure the default MinIO bucket exists after client initialization
if minio_init_success: 
    logging.info("MinIO 客户端初始化成功，正在检查存储桶...")
    bucket_result = ensure_bucket_exists() # Uses the global bucket_name initialized in minio_config
    if not bucket_result:
        logging.error("存储桶检查或创建失败。文件上传功能可能受影响。")
else:
    logging.error("MinIO 客户端初始化失败。存储桶检查已跳过。API 文件功能可能无法正常工作。")
    logging.error("请检查 MinIO 服务是否正常运行，以及配置参数是否正确。")

# Create Flask app AFTER configurations are loaded and clients initialized
app = Flask(__name__)
# 添加 CORS 支持，允许所有源（在生产环境中应该限制来源）
CORS(app)

# Flask app configurations (upload size, etc.)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'csv', 'json', 'xml', 'md', 'jpg', 'jpeg', 'png', 'gif',
    'zip', 'rar', '7z', 'tar', 'gz'
}

def allowed_file(filename):
    """检查文件类型是否允许上传"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    """获取文件类型"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'

@app.route('/api/folders', methods=['GET'])
def get_folders_api():
    """获取文件夹列表 API (支持分页和排序)"""
    try:
        parent_id = request.args.get('parent_id')
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 10, type=int)
        sort_by = request.args.get('sort_by', 'name')
        sort_order = request.args.get('sort_order', 'ASC')

        if parent_id == 'null' or parent_id == 'undefined': # Handle cases where client might send string "null"
            parent_id = None
            
        folders_data = get_folders(parent_id=parent_id, page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order)
        # The new get_folders in db_utils returns a dict with pagination, directly return it.
        # Add a code and message if that's the standard, otherwise this is fine.
        return jsonify(folders_data) 

    except Exception as e:
        logging.error(f"获取文件夹列表失败: {e}")
        # Match the db_utils error response structure if possible, or a standard API error
        return jsonify({
            'items': [], 
            'total_items': 0, 
            'page': request.args.get('page', 1, type=int), # reflect requested page
            'page_size': request.args.get('page_size', 10, type=int), # reflect requested page_size
            'total_pages': 0,
            'error': f'获取文件夹列表失败: {str(e)}'
        }), 500

@app.route('/api/folders', methods=['POST'])
def create_folder_api():
    """创建文件夹 API"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({
                'code': 400,
                'message': '缺少必要参数: name',
                'data': None
            }), 400
        
        name = data.get('name')
        parent_id = data.get('parent_id')
        
        # TODO: Get actual user_id from authenticated session/token
        # The X-User-Id header is a placeholder. Proper auth should provide this.
        user_id = request.headers.get("X-User-Id", "anonymous") 
        
        # generate_unique_id is a direct import from db_utils
        folder_id_val = generate_uuid() 
        
        # insert_folder is a direct import from db_utils, uses global pool
        # In db_utils.py, insert_folder was modified to accept id_val, let's check its signature in db_utils
        # Looking at db_utils.py, insert_folder(name, parent_id=None, created_by=None) -> returns folder_id
        # It generates its own UUID. If we want to pass a pre-generated one, db_utils.insert_folder needs adjustment
        # For now, let's assume db_utils.insert_folder generates the ID.
        
        # Correcting: The previous edit for create_folder_api in file_api.py had:
        # folder_id = generate_unique_id()
        # if insert_folder(name, parent_id, created_by=user_id, id_val=folder_id):
        # This `id_val` is not in the `db_utils.insert_folder` signature. 
        # Let's revert to `insert_folder` returning the ID it generates.

        created_folder_id = insert_folder(name, parent_id, created_by=user_id)
        
        if created_folder_id:
            # Fetch the created folder to include its creation timestamp from DB
            folder_details = get_folder_by_id(created_folder_id)
            return jsonify({
                'code': 0,
                'message': '文件夹创建成功',
                'data': folder_details # Return the full folder details
            })
        else:
            return jsonify({
                'code': 500,
                'message': '文件夹创建失败',
                'data': None
            }), 500
    except Exception as e:
        logging.error(f"创建文件夹失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'创建文件夹失败: {str(e)}',
            'data': None
        }), 500

@app.route('/api/folders/<folder_id>', methods=['DELETE'])
def delete_folder_api(folder_id):
    """删除文件夹 API"""
    try:
        if delete_folder(folder_id):
            return jsonify({
                'code': 0,
                'message': '文件夹删除成功',
                'data': None
            })
        else:
            return jsonify({
                'code': 404,
                'message': '文件夹不存在',
                'data': None
            }), 404
    except Exception as e:
        logging.error(f"删除文件夹失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'删除文件夹失败: {str(e)}',
            'data': None
        }), 500

@app.route('/api/folders/<folder_id>', methods=['PUT'])
def modify_folder(folder_id):
    """更新文件夹名称或移动文件夹"""
    data = request.json
    new_name = data.get('name')
    new_parent_id = data.get('parent_id') # Client can send "ROOT" for root, or a folder_id

    # TODO: Get actual user_id from authenticated session/token
    updated_by = request.headers.get("X-User-Id", "anonymous") # Placeholder for auth

    if not new_name and new_parent_id is None:
        return jsonify({"error": "必须提供新的名称或父文件夹ID"}), 400

    # Ensure parent_id is None if client sends "ROOT" or similar for moving to root
    if new_parent_id == "ROOT":
        db_parent_id = None
    else:
        db_parent_id = new_parent_id

    if update_folder(folder_id, name=new_name, parent_id=db_parent_id, updated_by=updated_by):
        # Fetch the updated folder details to return
        updated_folder_data = get_folder_by_id(folder_id)
        if updated_folder_data:
             return jsonify({"message": "文件夹更新成功", "folder": updated_folder_data}), 200
        else:
            # Should not happen if update_folder returned True, but as a safeguard
            return jsonify({"message": "文件夹更新成功，但获取更新后信息失败"}), 200
    else:
        return jsonify({"error": "文件夹更新失败或未找到"}), 404 # Or 500 if it's a server error

@app.route('/api/files', methods=['GET'])
def list_files_api():
    """获取文件列表，支持按文件夹ID过滤，分页和排序"""
    folder_id = request.args.get('folder_id')
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'ASC')

    if folder_id == 'null' or folder_id == 'undefined': # Handle cases where client might send string "null"
        folder_id = None

    files_data = get_files(folder_id=folder_id, page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order)
    
    # Add pre-signed URLs to each file item
    if files_data and 'items' in files_data:
        for file_item in files_data['items']:
            if file_item.get('location'):
                file_item['url'] = get_file_url(file_item['location'])
            else:
                file_item['url'] = None
                
    return jsonify(files_data)

@app.route('/api/files', methods=['POST'])
def upload_file_api():
    """上传文件 API"""
    try:
        # 检查是否存在文件
        if 'file' not in request.files:
            return jsonify({
                'code': 400,
                'message': '没有文件被上传',
                'data': None
            }), 400
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return jsonify({
                'code': 400,
                'message': '未选择文件',
                'data': None
            }), 400
        
        # 检查文件类型是否允许
        if not allowed_file(file.filename):
            return jsonify({
                'code': 400,
                'message': '不支持的文件类型',
                'data': None
            }), 400
        
        # 获取其他参数
        folder_id = request.form.get('folder_id')
        created_by = request.form.get('created_by')
        
        # 安全处理文件名
        filename = secure_filename(file.filename)
        
        # 生成唯一的文件名
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # 读取文件内容并获取大小
        file_content = file.read()
        file_size = len(file_content)
        file_type = get_file_type(filename)
        
        # 构建 MinIO 对象路径
        if folder_id:
            object_name = f"{folder_id}/{unique_filename}"
        else:
            object_name = unique_filename
        
        # 上传到 MinIO - 明确指定文件大小
        upload_success = upload_file_to_minio(
            io.BytesIO(file_content),
            object_name,
            content_type=file_type,
            metadata={
                'filename': filename,
                'folder_id': folder_id or 'none',
                'upload_date': datetime.now().isoformat()
            },
            file_size=file_size  # 显式传递文件大小
        )
        
        if not upload_success:
            return jsonify({
                'code': 500,
                'message': '文件上传到 MinIO 失败',
                'data': None
            }), 500
        
        # 将文件信息保存到数据库
        # 生成文件ID
        file_id = generate_uuid()
        
        success = insert_file(
            id=file_id,
            name=filename,
            location=object_name,
            size=file_size,
            file_type=file_type,
            folder_id=folder_id,
            created_by=created_by
        )
        
        if not success:
            # 如果数据库插入失败，尝试从 MinIO 删除文件
            delete_file_from_minio(object_name)
            return jsonify({
                'code': 500,
                'message': '文件信息保存到数据库失败',
                'data': None
            }), 500
        
        # 获取文件的临时 URL
        file_url = get_file_url(object_name)
        
        return jsonify({
            'code': 0,
            'message': '文件上传成功',
            'data': {
                'id': file_id,
                'name': filename,
                'location': object_name,
                'size': file_size,
                'type': file_type,
                'folder_id': folder_id,
                'upload_date': datetime.now().isoformat(),
                'created_by': created_by,
                'url': file_url
            }
        })
    except Exception as e:
        logging.error(f"上传文件失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'上传文件失败: {str(e)}',
            'data': None
        }), 500

@app.route('/api/files/<file_id>', methods=['GET'])
def download_file_api(file_id):
    """下载文件 API"""
    try:
        # 从数据库获取文件信息
        file_info = get_file_by_id(file_id)
        if not file_info:
            return jsonify({
                'code': 404,
                'message': '文件不存在',
                'data': None
            }), 404
        
        # 获取文件的临时 URL
        file_url = get_file_url(file_info['location'])
        
        # 重定向到临时 URL
        return jsonify({
            'code': 0,
            'message': '获取文件下载链接成功',
            'data': {
                'url': file_url,
                'name': file_info['name'],
                'size': file_info['size'],
                'type': file_info['type']
            }
        })
    except Exception as e:
        logging.error(f"下载文件失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'下载文件失败: {str(e)}',
            'data': None
        }), 500

@app.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file_api(file_id):
    """删除文件 API"""
    try:
        # 从数据库获取文件信息
        file_info = get_file_by_id(file_id)
        if not file_info:
            return jsonify({
                'code': 404,
                'message': '文件不存在',
                'data': None
            }), 404
        
        # 从 MinIO 删除文件
        location = file_info['location']
        minio_delete_success = delete_file_from_minio(location)
        
        # 从数据库删除文件记录
        db_delete_success = delete_file(file_id)
        
        if minio_delete_success and db_delete_success:
            return jsonify({
                'code': 0,
                'message': '文件删除成功',
                'data': None
            })
        else:
            message = []
            if not minio_delete_success:
                message.append("MinIO 文件删除失败")
            if not db_delete_success:
                message.append("数据库记录删除失败")
            
            return jsonify({
                'code': 500,
                'message': '文件删除部分失败: ' + ', '.join(message),
                'data': None
            }), 500
    except Exception as e:
        logging.error(f"删除文件失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'删除文件失败: {str(e)}',
            'data': None
        }), 500

@app.route('/api/files/batch', methods=['POST'])
def batch_upload_files_api():
    """批量上传文件 API"""
    try:
        # 检查是否存在文件
        if 'files[]' not in request.files:
            return jsonify({
                'code': 400,
                'message': '没有文件被上传',
                'data': None
            }), 400
        
        # 获取其他参数
        folder_id = request.form.get('folder_id')
        created_by = request.form.get('created_by')
        
        # 处理所有上传的文件
        files = request.files.getlist('files[]')
        uploaded_files = []
        failed_files = []
        
        for file in files:
            try:
                # 检查文件名是否为空
                if file.filename == '':
                    failed_files.append({
                        'name': 'unknown',
                        'reason': '文件名为空'
                    })
                    continue
                
                # 检查文件类型是否允许
                if not allowed_file(file.filename):
                    failed_files.append({
                        'name': file.filename,
                        'reason': '不支持的文件类型'
                    })
                    continue
                
                # 安全处理文件名
                filename = secure_filename(file.filename)
                
                # 生成唯一的文件名
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                
                # 读取文件内容并计算大小
                file_content = file.read()
                file_size = len(file_content)
                file_type = get_file_type(filename)
                
                # 构建 MinIO 对象路径
                if folder_id:
                    object_name = f"{folder_id}/{unique_filename}"
                else:
                    object_name = unique_filename
                
                # 上传到 MinIO - 明确指定文件大小
                upload_success = upload_file_to_minio(
                    io.BytesIO(file_content),
                    object_name,
                    content_type=file_type,
                    metadata={
                        'filename': filename,
                        'folder_id': folder_id or 'none',
                        'upload_date': datetime.now().isoformat()
                    },
                    file_size=file_size  # 显式传递文件大小
                )
                
                if not upload_success:
                    failed_files.append({
                        'name': filename,
                        'reason': '上传到 MinIO 失败'
                    })
                    continue
                
                # 将文件信息保存到数据库
                # 生成文件ID
                file_id = generate_uuid()
                
                success = insert_file(
                    id=file_id,
                    name=filename,
                    location=object_name,
                    size=file_size,
                    file_type=file_type,
                    folder_id=folder_id,
                    created_by=created_by
                )
                
                if not success:
                    # 如果数据库插入失败，尝试从 MinIO 删除文件
                    delete_file_from_minio(object_name)
                    failed_files.append({
                        'name': filename,
                        'reason': '保存到数据库失败'
                    })
                    continue
                
                # 获取文件的临时 URL
                file_url = get_file_url(object_name)
                
                # 添加到成功列表
                uploaded_files.append({
                    'id': file_id,
                    'name': filename,
                    'location': object_name,
                    'size': file_size,
                    'type': file_type,
                    'folder_id': folder_id,
                    'upload_date': datetime.now().isoformat(),
                    'created_by': created_by,
                    'url': file_url
                })
            except Exception as e:
                logging.error(f"文件 {file.filename} 上传失败: {e}")
                failed_files.append({
                    'name': file.filename if hasattr(file, 'filename') else 'unknown',
                    'reason': str(e)
                })
        
        return jsonify({
            'code': 0,
            'message': f'批量上传完成: {len(uploaded_files)} 成功, {len(failed_files)} 失败',
            'data': {
                'uploaded': uploaded_files,
                'failed': failed_files
            }
        })
    except Exception as e:
        logging.error(f"批量上传文件失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'批量上传文件失败: {str(e)}',
            'data': None
        }), 500

# 健康检查 API
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查 API"""
    return jsonify({
        'code': 0,
        'message': 'API 服务正常',
        'data': {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat()
        }
    })

# TODO: Add proper authentication decorator here
@app.route('/api/files/<file_id>', methods=['PUT'])
def rename_or_move_file_api(file_id):
    """重命名文件或移动文件到不同文件夹"""
    data = request.json
    new_name = data.get('name')
    new_folder_id_from_req = data.get('folder_id') # Client might send "ROOT" for root, actual ID, or omit for no change

    # TODO: Get actual user_id from authenticated session/token
    updated_by = request.headers.get("X-User-Id", "anonymous") # Placeholder for auth

    if not new_name and new_folder_id_from_req is None:
        return jsonify({"error": "必须提供新的文件名或目标文件夹ID"}), 400

    current_file_info = get_file_by_id(file_id)
    if not current_file_info:
        return jsonify({"error": "文件未找到"}), 404

    final_new_folder_id = current_file_info['folder_id'] # Start with current folder_id
    update_folder = False
    if new_folder_id_from_req is not None:
        update_folder = True
        if new_folder_id_from_req == "ROOT":
            final_new_folder_id = None
        else:
            # Validate if new_folder_id_from_req exists if it's not ROOT
            target_folder = get_folder_by_id(new_folder_id_from_req)
            if not target_folder:
                return jsonify({"error": f"目标文件夹 {new_folder_id_from_req} 不存在"}), 400
            final_new_folder_id = new_folder_id_from_req
    
    final_new_name = new_name if new_name else current_file_info['name']
    current_location = current_file_info['location']
    new_location_minio = current_location # Default to current location

    # If folder changes, MinIO object path needs to change.
    # Current MinIO path format: {folder_id}/{uuid}_{filename} or {uuid}_{filename} for root
    # We need the original file base name (uuid_filename part) to construct the new path.
    
    minio_object_basename = os.path.basename(current_location)

    if update_folder and final_new_folder_id != current_file_info['folder_id']:
        old_minio_object_name = current_location
        if final_new_folder_id:
            new_minio_object_name = f"{final_new_folder_id}/{minio_object_basename}"
        else: # Moving to root
            new_minio_object_name = minio_object_basename
        
        try:
            logging.info(f"Attempting to move MinIO object from {old_minio_object_name} to {new_minio_object_name}")
            # Copy object to new location - 调整 CopySource 的使用方式
            try:
                # 尝试当前导入的 CopySource
                source_object = CopySource(bucket_name, old_minio_object_name)
                minio_client.copy_object(
                    bucket_name,
                    new_minio_object_name,
                    source_object
                )
            except (TypeError, AttributeError):
                # 如果当前 CopySource 不兼容，尝试直接使用字典格式 (适用于某些版本的 minio)
                minio_client.copy_object(
                    bucket_name,
                    new_minio_object_name,
                    {'bucket': bucket_name, 'object': old_minio_object_name}
                )
                
            # Delete old object
            minio_client.remove_object(bucket_name, old_minio_object_name)
            new_location_minio = new_minio_object_name
            logging.info(f"MinIO object moved successfully to {new_location_minio}")
        except Exception as e:
            logging.error(f"MinIO对象移动失败: 从 {old_minio_object_name} 到 {new_minio_object_name}, 错误: {e}")
            return jsonify({"error": f"文件系统操作失败: {str(e)}"}), 500

    if update_file(file_id, name=final_new_name, new_folder_id=final_new_folder_id, new_location=new_location_minio, updated_by=updated_by):
        updated_file_info = get_file_by_id(file_id)
        return jsonify({"message": "文件更新成功", "file": updated_file_info}), 200
    else:
        # This case might mean DB update failed after a successful MinIO move, which is problematic.
        # Ideally, use a transaction or a cleanup mechanism for MinIO if DB fails.
        logging.error(f"文件数据库记录更新失败 file_id: {file_id} after potential MinIO op. New loc: {new_location_minio}")
        return jsonify({"error": "文件数据库记录更新失败"}), 500

@app.route('/api/save-markdown', methods=['POST'])
def save_markdown_api():
    """保存 Markdown 内容为新文件，并关联到原始文件"""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['original_file_id', 'markdown_content', 'markdown_filename']):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数: original_file_id, markdown_content, markdown_filename',
                'data': None
            }), 400

        original_file_id = data['original_file_id']
        markdown_content = data['markdown_content']
        markdown_filename = secure_filename(data['markdown_filename']) # Sanitize filename

        if not markdown_filename.lower().endswith('.md'):
            markdown_filename += '.md'

        # 1. 获取原始文件信息
        original_file_details = get_file_by_id(original_file_id)
        if not original_file_details:
            return jsonify({
                'code': 404,
                'message': f'原始文件ID {original_file_id} 未找到',
                'data': None
            }), 404

        original_folder_id = original_file_details.get('folder_id')
        created_by_user = original_file_details.get('created_by') or request.headers.get("X-User-Id", "anonymous")

        # 2. 为 Markdown 文件生成新 ID 和 MinIO 位置
        new_file_id = generate_uuid()
        minio_object_name = f"markdowns/{new_file_id}/{markdown_filename}"

        # 3. 上传 Markdown 内容到 MinIO
        content_bytes = markdown_content.encode('utf-8')
        content_stream = io.BytesIO(content_bytes)
        content_length = len(content_bytes)

        try:
            upload_file_to_minio(
                file_data=content_stream,
                object_name=minio_object_name,
                target_bucket_name=bucket_name,
                content_type='text/markdown',
                file_size=content_length
            )
            logging.info(f"Markdown 文件 {markdown_filename} (ID: {new_file_id}) 已上传到 MinIO: {minio_object_name}")
        except Exception as e:
            logging.error(f"上传 Markdown 到 MinIO 失败: {e}")
            return jsonify({
                'code': 500,
                'message': f'上传 Markdown 到 MinIO 失败: {str(e)}',
                'data': None
            }), 500

        # 4. 在数据库中插入新文件记录
        file_data_to_insert = {
            'id': new_file_id,
            'name': markdown_filename,
            'location': minio_object_name, 
            'size': content_length,
            'file_type': 'text/markdown',
            'folder_id': original_folder_id, 
            'created_by': created_by_user,
            'derived_from_file_id': original_file_id
        }
        
        inserted_file_id = insert_file(**file_data_to_insert)
        if not inserted_file_id: 
            try:
                delete_file_from_minio(minio_object_name)
                logging.info(f"数据库插入失败后，已从 MinIO 清理对象: {minio_object_name}")
            except Exception as minio_del_err:
                logging.error(f"数据库插入失败后，从 MinIO 清理对象 {minio_object_name} 失败: {minio_del_err}")
            
            return jsonify({
                'code': 500,
                'message': '保存 Markdown 文件记录到数据库失败',
                'data': None
            }), 500

        saved_file_details = get_file_by_id(new_file_id)
        if not saved_file_details:
            logging.error(f"成功插入数据库但无法立即获取文件 {new_file_id} 的详细信息。")
            saved_file_details = file_data_to_insert 
            saved_file_details['upload_date'] = datetime.utcnow().isoformat() 

        return jsonify({
            'code': 0,
            'message': 'Markdown 文件保存成功',
            'data': saved_file_details
        }), 201

    except Exception as e:
        logging.exception(f"保存 Markdown API 出错: {e}") 
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': None
        }), 500

@app.route('/generate_api_key', methods=['POST'])
def generate_api_key():
    print("==== /generate_api_key 被调用 ====")
    print("请求来源：", request.remote_addr)
    data = request.get_json(force=True)
    base_url = data.get('BASE_URL')
    email = data.get('EMAIL')
    password = data.get('PASSWORD')

    if not all([base_url, email, password]):
        return jsonify({'code': 400, 'msg': 'Missing required parameters: BASE_URL, EMAIL, PASSWORD'}), 400

    # 动态设置API地址
    global BASE_URL, LOGIN_URL, CREATE_TOKEN_URL
    BASE_URL = base_url
    LOGIN_URL = f"{BASE_URL}/user/login"
    CREATE_TOKEN_URL = f"{BASE_URL}/system/new_token"

    auth_token = login_and_get_auth_header(email, password)
    if not auth_token:
        return jsonify({'code': 401, 'msg': 'Login failed or failed to retrieve Authorization header.'}), 401

    api_key = create_api_key_with_auth_header(auth_token)
    if not api_key:
        return jsonify({'code': 500, 'msg': 'Failed to create API key after successful login.'}), 500

    return jsonify({'code': 0, 'api_key': api_key})

# 添加新的API端点，专门用于获取文件URL
@app.route('/api/get-file-url', methods=['POST'])
def get_file_url_api():
    """获取文件预签名URL的API"""
    try:
        data = request.json
        if not data or 'object_name' not in data:
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：object_name',
                'url': None
            }), 400
        
        object_name = data['object_name']
        # 使用数字而不是timedelta对象
        expires = int(data.get('expires', 604800))  # 默认7天
        
        # 调用minio_config的get_file_url函数获取预签名URL
        url = get_file_url(object_name=object_name, expires=expires)
        
        if not url:
            return jsonify({
                'code': 500,
                'message': '获取文件URL失败',
                'url': None
            }), 500
            
        return jsonify({
            'code': 0,
            'message': '获取文件URL成功',
            'url': url
        })
    except Exception as e:
        logging.error(f"获取文件URL失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取文件URL失败: {str(e)}',
            'url': None
        }), 500

@app.route('/api/files/<file_id>/content', methods=['GET'])
def get_file_content_api(file_id):
    """获取文件内容 API"""
    try:
        # 1. 获取文件信息
        file_details = get_file_by_id(file_id)
        if not file_details:
            return jsonify({
                'code': 404,
                'message': f'文件ID {file_id} 未找到',
                'data': None
            }), 404

        # 2. 从MinIO获取文件内容
        try:
            object_name = file_details['location']
            
            # 获取文件对象
            response = minio_client.get_object(bucket_name, object_name)
            file_content = response.read()
            
            # 根据文件类型处理内容
            if file_details['type'] == 'text/markdown' or file_details['name'].endswith('.md'):
                # Markdown文件返回文本内容
                content_text = file_content.decode('utf-8')
                return jsonify({
                    'code': 0,
                    'message': '获取文件内容成功',
                    'data': {
                        'id': file_id,
                        'name': file_details['name'],
                        'type': file_details['type'],
                        'content': content_text,
                        'size': file_details['size']
                    }
                }), 200
            else:
                # 其他文件类型返回base64编码的内容或者文件URL
                return jsonify({
                    'code': 0,
                    'message': '获取文件内容成功',
                    'data': {
                        'id': file_id,
                        'name': file_details['name'],
                        'type': file_details['type'],
                        'content': None,  # 非文本文件不返回内容
                        'size': file_details['size'],
                        'url': get_file_url(object_name)  # 返回预签名URL用于预览
                    }
                }), 200
                
        except Exception as e:
            logging.error(f"从MinIO获取文件内容失败: {e}")
            return jsonify({
                'code': 500,
                'message': f'获取文件内容失败: {str(e)}',
                'data': None
            }), 500

    except Exception as e:
        logging.exception(f"获取文件内容API出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': None
        }), 500

@app.route('/api/files/<file_id>/content', methods=['PUT'])
def update_file_content_api(file_id):
    """更新文件内容 API（主要用于Markdown文件）"""
    try:
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({
                'code': 400,
                'message': '缺少必要参数: content',
                'data': None
            }), 400

        new_content = data['content']
        
        # 1. 获取文件信息
        file_details = get_file_by_id(file_id)
        if not file_details:
            return jsonify({
                'code': 404,
                'message': f'文件ID {file_id} 未找到',
                'data': None
            }), 404

        # 2. 检查是否为可编辑的文件类型
        if file_details['type'] != 'text/markdown' and not file_details['name'].endswith('.md'):
            return jsonify({
                'code': 400,
                'message': '只支持编辑Markdown文件',
                'data': None
            }), 400

        # 3. 上传新内容到MinIO
        try:
            object_name = file_details['location']
            content_bytes = new_content.encode('utf-8')
            content_stream = io.BytesIO(content_bytes)
            content_length = len(content_bytes)

            # 上传更新的内容
            upload_file_to_minio(
                file_data=content_stream,
                object_name=object_name,
                target_bucket_name=bucket_name,
                content_type='text/markdown',
                file_size=content_length
            )

            # 4. 更新数据库中的文件大小
            update_file(file_id, new_location=None, updated_by=None)  # 这里可以扩展update_file函数来支持更新文件大小
            
            logging.info(f"文件内容更新成功: {file_id}")
            
            return jsonify({
                'code': 0,
                'message': '文件内容更新成功',
                'data': {
                    'id': file_id,
                    'name': file_details['name'],
                    'size': content_length
                }
            }), 200
            
        except Exception as e:
            logging.error(f"更新文件内容到MinIO失败: {e}")
            return jsonify({
                'code': 500,
                'message': f'更新文件内容失败: {str(e)}',
                'data': None
            }), 500

    except Exception as e:
        logging.exception(f"更新文件内容API出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': None
        }), 500

# Main execution point
if __name__ == '__main__':
    # Load Flask run configurations from .env
    flask_run_host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    flask_run_port = int(os.getenv('FLASK_RUN_PORT', 5000))
    flask_debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    # Add MIME types (if still needed, can also be done globally)
    mimetypes.add_type('application/javascript', '.js')
    mimetypes.add_type('text/css', '.css')
    
    # Start Flask app
    app.run(host=flask_run_host, port=flask_run_port, debug=flask_debug) 