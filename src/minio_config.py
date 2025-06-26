"""
MinIO 服务配置模块
提供与 MinIO 对象存储连接和交互的配置和工具函数
"""
import logging
import os # Added for environ
from dotenv import load_dotenv # Added for .env loading
from minio import Minio
from minio.error import S3Error
from datetime import timedelta # 确保导入 timedelta

# Load environment variables from .env file
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# MinIO 服务器配置 (now from .env)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "127.0.0.1") 
MINIO_PORT = int(os.getenv("MINIO_PORT", 9000))
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE = os.getenv("MINIO_SECURE", "False").lower() == "true"
DEFAULT_BUCKET_NAME = os.getenv("DEFAULT_BUCKET_NAME", "deeprag-files")

# Global MinIO client and bucket name to be initialized by a central app setup
minio_client = None
bucket_name = None

def init_minio_client():
    """
    Initializes the global MinIO client and bucket name from environment variables.
    This should be called once at application startup.
    """
    global minio_client, bucket_name

    # 打印环境变量以便调试
    logging.info(f"MinIO 配置信息: ENDPOINT={MINIO_ENDPOINT}, PORT={MINIO_PORT}, ACCESS_KEY={MINIO_ACCESS_KEY}, BUCKET={DEFAULT_BUCKET_NAME}")
    
    try:
        minio_client = Minio(
            endpoint=f"{MINIO_ENDPOINT}:{MINIO_PORT}",
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
        bucket_name = DEFAULT_BUCKET_NAME # Using the value loaded from .env
        
        # 尝试连接检查
        try:
            exists = minio_client.bucket_exists(bucket_name) # Simple check
            logging.info(f"MinIO 客户端初始化成功: {MINIO_ENDPOINT}:{MINIO_PORT}, bucket: {bucket_name}, 存储桶存在: {exists}")
            return True
        except S3Error as se:
            logging.error(f"MinIO 连接检查失败 (S3Error): {se}")
            # 尝试获取更详细的错误信息
            logging.error(f"S3Error 详细信息: 代码={getattr(se, 'code', 'N/A')}, 消息={getattr(se, 'message', 'N/A')}")
            minio_client = None
            return False
        except Exception as e:
            logging.error(f"MinIO 连接检查失败 (未知错误): {e}")
            minio_client = None
            return False
    except Exception as e:
        logging.error(f"MinIO 客户端初始化失败: {e}")
        # 详细记录错误信息
        logging.error(f"初始化参数: endpoint={MINIO_ENDPOINT}:{MINIO_PORT}, access_key={MINIO_ACCESS_KEY}, secure={MINIO_SECURE}")
        logging.error(f"错误类型: {type(e).__name__}")
        minio_client = None
        return False

# 自动初始化MinIO客户端
logging.info("正在初始化MinIO客户端...")
init_result = init_minio_client()
if init_result:
    logging.info("MinIO客户端初始化成功")
else:
    logging.error("MinIO客户端初始化失败，某些功能可能无法正常工作")

def ensure_bucket_exists(target_bucket_name=None):
    """
    确保指定的存储桶存在，如果不存在则创建
    
    Args:
        target_bucket_name (str, optional): 存储桶名称. Defaults to global bucket_name.
        
    Returns:
        bool: 如果存储桶存在或成功创建则返回 True，否则返回 False
    """
    global minio_client # Use the global client
    if not minio_client:
        logging.error("MinIO client not initialized. Call init_minio_client() first.")
        return False

    bucket_to_check = target_bucket_name if target_bucket_name else bucket_name
    if not bucket_to_check:
        logging.error("No bucket name specified or initialized.")
        return False

    try:
        # 检查存储桶是否存在
        if not minio_client.bucket_exists(bucket_to_check):
            # 创建存储桶
            minio_client.make_bucket(bucket_to_check)
            logging.info(f"存储桶 '{bucket_to_check}' 创建成功")
        else:
            logging.info(f"存储桶 '{bucket_to_check}' 已存在")
        return True
    except S3Error as e:
        logging.error(f"存储桶操作失败: {e}")
        return False
    except Exception as e: # Catch other potential errors like connection issues if not caught during init
        logging.error(f"确保存储桶存在时发生意外错误: {e}")
        return False

def upload_file_to_minio(file_data, object_name, target_bucket_name=None, content_type=None, metadata=None, file_size=None):
    """
    将文件上传到 MinIO 存储桶
    
    Args:
        file_data (bytes or file-like object): 文件数据
        object_name (str): 对象名称（MinIO 中的存储路径）
        target_bucket_name (str, optional): 存储桶名称
        content_type (str, optional): 文件内容类型
        metadata (dict, optional): 文件元数据
        file_size (int, optional): 文件大小（字节）
        
    Returns:
        bool: 上传成功返回 True，失败返回 False
    """
    global minio_client # Use the global client
    if not minio_client:
        logging.error("MinIO client not initialized for upload.")
        return False

    current_bucket = target_bucket_name if target_bucket_name else bucket_name
    if not current_bucket:
        logging.error("No bucket name specified or initialized for upload.")
        return False
    
    # 确保存储桶存在
    if not ensure_bucket_exists(current_bucket):
        return False
    
    try:
        # 如果提供了文件大小，使用它，否则尝试自动计算
        length = file_size if file_size is not None else -1
        logging.info(f"准备上传文件: {object_name}, 指定大小: {length} 字节")
        
        # 上传文件
        result = minio_client.put_object(
            bucket_name=current_bucket,
            object_name=object_name,
            data=file_data,
            length=length,  # 使用指定的文件大小或自动计算
            content_type=content_type,
            metadata=metadata
        )
        logging.info(f"文件上传成功: {object_name}, etag: {result.etag}")
        return True
    except S3Error as e:
        logging.error(f"文件上传失败: {e}")
        return False

def get_file_url(object_name, target_bucket_name=None, expires=604800):
    """
    获取文件的预签名 URL，用于临时访问
    
    Args:
        object_name (str): 对象名称
        target_bucket_name (str, optional): 存储桶名称
        expires (int or timedelta, optional): URL 过期时间（秒或timedelta对象），默认为 7 天 (604800秒)
        
    Returns:
        str: 预签名 URL，失败则返回 None
    """
    global minio_client # Use the global client
    if not minio_client:
        logging.error("MinIO client not initialized for getting file URL.")
        return None

    current_bucket = target_bucket_name if target_bucket_name else bucket_name
    if not current_bucket:
        logging.error("No bucket name specified or initialized for getting file URL.")
        return None

    try:
        expires_in_seconds = 604800 # 默认值
        if isinstance(expires, timedelta):
            expires_in_seconds = int(expires.total_seconds())
        elif isinstance(expires, (int, float)):
            expires_in_seconds = int(expires)
        else:
            logging.warning(f"expires 参数类型不受支持 ({type(expires)})，使用默认值: 604800秒")
        
        if expires_in_seconds <= 0:
            logging.warning(f"expires_in_seconds 参数必须为正整数，当前值: {expires_in_seconds}，重置为默认值: 604800秒")
            expires_in_seconds = 604800

        # 转换为 timedelta 对象传递给 MinIO SDK
        expires_delta = timedelta(seconds=expires_in_seconds)

        logging.info(f"生成预签名 URL: {object_name}, 过期时间: {expires_delta} (即 {expires_in_seconds}秒)")
        
        # 生成预签名 URL
        url = minio_client.presigned_get_object(
            bucket_name=current_bucket,
            object_name=object_name,
            expires=expires_delta # 传递 timedelta 对象
        )
        if url:
            logging.info(f"成功生成预签名 URL")
        else:
            logging.error(f"生成预签名 URL 失败: 返回的URL为空")
        return url
    except S3Error as e:
        logging.error(f"获取文件 URL 失败 (S3Error): {e}")
        return None
    except AttributeError as e:
        # 此处捕获 AttributeError 是为了调试，理论上不应再发生
        logging.error(f"获取文件 URL 失败 (AttributeError): {e}. 这不应该发生，因为已转换为timedelta.")
        logging.error(f"参数类型: expires_delta={type(expires_delta)}, object_name={type(object_name)}, bucket_name={type(current_bucket)}")
        return None
    except Exception as e:
        logging.error(f"获取文件 URL 过程中发生意外错误: {e}")
        logging.error(f"错误类型: {type(e).__name__}")
        return None

def delete_file_from_minio(object_name, target_bucket_name=None):
    """
    从 MinIO 删除文件
    
    Args:
        object_name (str): 对象名称
        target_bucket_name (str, optional): 存储桶名称
        
    Returns:
        bool: 删除成功返回 True，失败返回 False
    """
    global minio_client # Use the global client
    if not minio_client:
        logging.error("MinIO client not initialized for deleting file.")
        return False
    
    current_bucket = target_bucket_name if target_bucket_name else bucket_name
    if not current_bucket:
        logging.error("No bucket name specified or initialized for deleting file.")
        return False

    try:
        # 删除文件
        minio_client.remove_object(current_bucket, object_name)
        logging.info(f"文件删除成功: {object_name} from bucket {current_bucket}")
        return True
    except S3Error as e:
        logging.error(f"文件删除失败: {e}")
        return False

def list_files_in_minio(prefix=None, target_bucket_name=None):
    """
    列出 MinIO 存储桶中的文件
    
    Args:
        prefix (str, optional): 对象名称前缀，用于筛选文件
        target_bucket_name (str, optional): 存储桶名称
        
    Returns:
        list: 文件对象列表，失败则返回空列表
    """
    global minio_client # Use the global client
    if not minio_client:
        logging.error("MinIO client not initialized for listing files.")
        return []

    current_bucket = target_bucket_name if target_bucket_name else bucket_name
    if not current_bucket:
        logging.error("No bucket name specified or initialized for listing files.")
        return []

    try:
        # 列出所有对象
        objects = minio_client.list_objects(current_bucket, prefix=prefix, recursive=True)
        return list(objects)
    except S3Error as e:
        logging.error(f"列出文件失败: {e}")
        return [] 