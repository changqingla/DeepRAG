"""
数据库工具模块
提供与 MySQL 数据库连接和交互的功能
"""
import logging
import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling
import uuid
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 数据库配置 (now from .env)
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'rag_flow'),
    'charset': os.getenv('DB_CHARSET', 'utf8mb4')
}
DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 5))

# 创建数据库连接池
connection_pool = None

def init_db_connection_pool(pool_size=None):
    """
    获取或创建数据库连接池. Should be called once at application startup.
    
    Args:
        pool_size (int, optional): 连接池大小. Defaults to DB_POOL_SIZE from .env.
        
    Returns:
        MySQLConnectionPool: 数据库连接池, or None if creation fails.
    """
    global connection_pool
    
    if connection_pool is None:
        try:
            size = pool_size if pool_size is not None else DB_POOL_SIZE
            connection_pool = pooling.MySQLConnectionPool(
                pool_name="deeprag_pool",
                pool_size=size,
                **DB_CONFIG
            )
            logging.info(f"数据库连接池创建成功: {DB_CONFIG['host']}:{DB_CONFIG['port']}, Pool Size: {size}")
        except mysql.connector.Error as e:
            logging.error(f"数据库连接池创建失败: {e}")
            connection_pool = None # Ensure pool is None if setup fails
            # Depending on severity, you might want to raise the exception or exit
    
    return connection_pool

def get_connection():
    """
    从连接池获取数据库连接
    
    Returns:
        MySQLConnection: 数据库连接
    """
    global connection_pool
    if connection_pool is None:
        logging.error("数据库连接池未初始化. 请先调用 init_db_connection_pool().")
        raise mysql.connector.Error("Database connection pool not initialized.")
        
    try:
        connection = connection_pool.get_connection()
        return connection
    except mysql.connector.Error as e:
        logging.error(f"获取数据库连接失败: {e}")
        raise

def execute_query(query, params=None, fetch=True):
    """
    执行 SQL 查询
    
    Args:
        query (str): SQL 查询语句
        params (tuple or dict, optional): 查询参数
        fetch (bool): 是否获取结果，默认为 True
        
    Returns:
        list or int: 如果 fetch 为 True，返回查询结果列表；否则返回受影响的行数
    """
    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params)
        
        if fetch:
            result = cursor.fetchall()
            return result
        else:
            connection.commit()
            return cursor.rowcount
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        logging.error(f"执行查询失败: {e}")
        raise
    finally:
        if connection:
            connection.close()

def generate_uuid():
    """
    生成 UUID（不带连字符）
    
    Returns:
        str: UUID 字符串
    """
    return uuid.uuid4().hex

def insert_folder(name, parent_id=None, created_by=None):
    """
    插入文件夹记录
    
    Args:
        name (str): 文件夹名称
        parent_id (str, optional): 父文件夹 ID
        created_by (str, optional): 创建者 ID
        
    Returns:
        str: 创建的文件夹 ID，失败则返回 None
    """
    folder_id = generate_uuid()
    now = datetime.now()
    
    query = """
    INSERT INTO folders (id, name, parent_id, created_at, created_by)
    VALUES (%s, %s, %s, %s, %s)
    """
    params = (folder_id, name, parent_id, now, created_by)
    
    try:
        execute_query(query, params, fetch=False)
        logging.info(f"文件夹创建成功: {name}, ID: {folder_id}")
        return folder_id
    except Exception as e:
        logging.error(f"文件夹创建失败: {e}")
        return None

def update_folder(folder_id, name=None, parent_id=None, updated_by=None):
    """
    更新文件夹信息

    Args:
        folder_id (str): 要更新的文件夹 ID
        name (str, optional): 新的文件夹名称
        parent_id (str, optional): 新的父文件夹 ID
        updated_by (str, optional): 更新者 ID (应从认证信息获取)

    Returns:
        bool: 更新成功返回 True, 失败返回 False
    """
    if not name and parent_id is None: # at least one field to update
        logging.warning("更新文件夹：没有提供要更新的字段")
        return False

    fields_to_update = []
    params = []

    if name:
        fields_to_update.append("name = %s")
        params.append(name)
    
    # Handling parent_id update, including setting it to NULL
    # We need a way to explicitly set parent_id to NULL if requested
    # For now, if parent_id is provided, we update it. If not, it's unchanged.
    # To set parent_id to NULL, client could send parent_id: null or a specific value like "ROOT"
    if parent_id is not None: # Allows setting parent_id, including to a new ID or potentially NULL if API design allows
        fields_to_update.append("parent_id = %s")
        params.append(parent_id if parent_id != "ROOT" else None) # Example: "ROOT" maps to NULL

    if not fields_to_update:
        return False
        
    # Add updated_at timestamp if needed, or let DB handle it if configured
    # params.append(datetime.now())
    # fields_to_update.append("updated_at = %s") # Assuming folders table has updated_at

    params.append(folder_id)
    
    query = f"""
    UPDATE folders
    SET {', '.join(fields_to_update)}
    WHERE id = %s
    """
    
    try:
        rowcount = execute_query(query, tuple(params), fetch=False)
        if rowcount > 0:
            logging.info(f"文件夹更新成功: ID {folder_id}")
            return True
        else:
            logging.warning(f"文件夹未找到或无更改: ID {folder_id}")
            return False
    except Exception as e:
        logging.error(f"文件夹更新失败: ID {folder_id}, {e}")
        return False

def insert_file(id, name, location, size, file_type, folder_id=None, created_by=None, derived_from_file_id=None):
    """
    插入文件记录
    
    Args:
        id (str): 文件 ID (预先生成)
        name (str): 文件名称
        location (str): 文件位置（MinIO 中的路径）
        size (int): 文件大小（字节）
        file_type (str): 文件类型
        folder_id (str, optional): 文件夹 ID
        created_by (str, optional): 创建者 ID
        derived_from_file_id (str, optional): 此文件衍生自的原始文件ID
        
    Returns:
        str: 成功则返回传入的文件 ID，失败则返回 None
    """
    # file_id = generate_uuid() # 不再内部生成ID，使用传入的id
    now = datetime.now()
    
    query = """
    INSERT INTO files (id, name, location, size, type, folder_id, upload_date, created_by, derived_from_file_id)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (id, name, location, size, file_type, folder_id, now, created_by, derived_from_file_id)
    
    try:
        execute_query(query, params, fetch=False)
        logging.info(f"文件记录创建成功: {name}, ID: {id}")
        return id # 返回传入的ID
    except Exception as e:
        logging.error(f"文件记录创建失败: {e}")
        return None

def update_file(file_id, name=None, new_folder_id=None, new_location=None, updated_by=None):
    """
    更新文件元数据 (名称, 文件夹, MinIO位置).

    Args:
        file_id (str): 要更新的文件 ID.
        name (str, optional): 新的文件名称.
        new_folder_id (str, optional): 新的文件夹 ID. Client can send "ROOT" to move to root.
        new_location (str, optional): 文件在MinIO中的新位置 (如果移动或重命名了MinIO对象).
        updated_by (str, optional): 更新者 ID (应从认证信息获取).

    Returns:
        bool: 更新成功返回 True, 失败返回 False.
    """
    fields_to_update = []
    params = []

    if name:
        fields_to_update.append("name = %s")
        params.append(name)
    
    if new_folder_id is not None: # Allows changing folder_id or setting to NULL
        fields_to_update.append("folder_id = %s")
        params.append(new_folder_id if new_folder_id != "ROOT" else None)
        
    if new_location:
        fields_to_update.append("location = %s")
        params.append(new_location)
    
    # Add updated_at logic if your table schema includes it
    # fields_to_update.append("upload_date = %s") # Or an 'updated_at' field
    # params.append(datetime.now())

    if not fields_to_update:
        logging.warning(f"更新文件: 没有提供要更新的字段 for file_id {file_id}")
        return False

    params.append(file_id)
    query = f"""
    UPDATE files
    SET {', '.join(fields_to_update)}
    WHERE id = %s
    """
    
    try:
        rowcount = execute_query(query, tuple(params), fetch=False)
        if rowcount > 0:
            logging.info(f"文件记录更新成功: ID {file_id}")
            return True
        else:
            logging.warning(f"文件记录未找到或无更改: ID {file_id}")
            return False # Or True if no change is not an error
    except Exception as e:
        logging.error(f"文件记录更新失败: ID {file_id}, {e}")
        return False

def get_folders(parent_id=None, page=1, page_size=10, sort_by='name', sort_order='ASC'):
    """
    获取文件夹列表 (支持分页和排序).
    
    Args:
        parent_id (str, optional): 父文件夹 ID，如果为 None 则获取根文件夹
        page (int): 页码 (1-indexed).
        page_size (int): 每页数量.
        sort_by (str): 排序字段 (name, created_at).
        sort_order (str): 排序顺序 (ASC, DESC).
        
    Returns:
        dict: 包含文件夹列表、总项目数、当前页码、每页数量和总页数的字典
    """
    query = """
    SELECT id, name, parent_id, created_at, created_by
    FROM folders
    WHERE parent_id <=> %s  -- <=> handles NULL parent_id gracefully for root folders
    """
    params = [parent_id]

    # Validate sort_by to prevent SQL injection
    valid_sort_fields = ['name', 'created_at']
    if sort_by not in valid_sort_fields:
        sort_by = 'name' # Default sort field
    if sort_order.upper() not in ['ASC', 'DESC']:
        sort_order = 'ASC' # Default sort order

    query += f" ORDER BY {sort_by} {sort_order.upper()}"
    
    # Add pagination
    offset = (page - 1) * page_size
    query += " LIMIT %s OFFSET %s"
    params.extend([page_size, offset])
    
    try:
        result = execute_query(query, tuple(params))
        
        # Optionally, get total count for pagination metadata
        count_query = "SELECT COUNT(*) as total FROM folders WHERE parent_id <=> %s"
        count_params = (parent_id,)
        total_count_result = execute_query(count_query, count_params)
        total_items = total_count_result[0]['total'] if total_count_result else 0
        
        return {
            'items': result,
            'total_items': total_items,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_items + page_size - 1) // page_size if page_size > 0 else 0
        }
    except Exception as e:
        logging.error(f"获取文件夹列表失败: {e}")
        return {'items': [], 'total_items': 0, 'page': page, 'page_size': page_size, 'total_pages': 0}

def get_files(folder_id=None, page=1, page_size=10, sort_by='name', sort_order='ASC'):
    """
    获取文件列表 (支持分页和排序).
    
    Args:
        folder_id (str, optional): 文件夹 ID，如果为 None 则获取未分类文件
        page (int): 页码 (1-indexed).
        page_size (int): 每页数量.
        sort_by (str): 排序字段 (name, upload_date, size, type).
        sort_order (str): 排序顺序 (ASC, DESC).

    Returns:
        dict: 包含文件列表、总项目数、当前页码、每页数量和总页数的字典
    """
    query = """
    SELECT id, name, location, size, type, folder_id, upload_date, created_by, derived_from_file_id
    FROM files
    WHERE folder_id <=> %s -- <=> handles NULL folder_id gracefully
    """
    params = [folder_id]

    valid_sort_fields = ['name', 'upload_date', 'size', 'type']
    if sort_by not in valid_sort_fields:
        sort_by = 'name'
    if sort_order.upper() not in ['ASC', 'DESC']:
        sort_order = 'ASC'
        
    query += f" ORDER BY {sort_by} {sort_order.upper()}"
    
    offset = (page - 1) * page_size
    query += " LIMIT %s OFFSET %s"
    params.extend([page_size, offset])
    
    try:
        result = execute_query(query, tuple(params))

        count_query = "SELECT COUNT(*) as total FROM files WHERE folder_id <=> %s"
        count_params = (folder_id,)
        total_count_result = execute_query(count_query, count_params)
        total_items = total_count_result[0]['total'] if total_count_result else 0
        
        return {
            'items': result,
            'total_items': total_items,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_items + page_size - 1) // page_size if page_size > 0 else 0
        }
    except Exception as e:
        logging.error(f"获取文件列表失败: {e}")
        return {'items': [], 'total_items': 0, 'page': page, 'page_size': page_size, 'total_pages': 0}

def get_file_by_id(file_id):
    """
    根据 ID 获取文件信息
    
    Args:
        file_id (str): 文件 ID
        
    Returns:
        dict: 文件信息，未找到则返回 None
    """
    query = """
    SELECT id, name, location, size, type, folder_id, upload_date, created_by, derived_from_file_id
    FROM files
    WHERE id = %s
    """
    params = (file_id,)
    
    try:
        result = execute_query(query, params)
        return result[0] if result else None
    except Exception as e:
        logging.error(f"获取文件失败: {e}")
        return None

def get_folder_by_id(folder_id):
    """通过 ID 获取单个文件夹信息."""
    query = """
    SELECT id, name, parent_id, created_at, created_by
    FROM folders
    WHERE id = %s
    """
    try:
        result = execute_query(query, (folder_id,))
        return result[0] if result else None
    except Exception as e:
        logging.error(f"获取文件夹失败: ID {folder_id}, {e}")
        return None

def delete_file(file_id):
    """
    删除文件记录
    
    Args:
        file_id (str): 文件 ID
        
    Returns:
        bool: 删除成功返回 True，失败返回 False
    """
    query = """
    DELETE FROM files
    WHERE id = %s
    """
    params = (file_id,)
    
    try:
        rowcount = execute_query(query, params, fetch=False)
        success = rowcount > 0
        if success:
            logging.info(f"文件记录删除成功: {file_id}")
        else:
            logging.warning(f"文件记录未找到: {file_id}")
        return success
    except Exception as e:
        logging.error(f"文件记录删除失败: {e}")
        return False

def delete_folder(folder_id):
    """
    删除文件夹记录
    
    Args:
        folder_id (str): 文件夹 ID
        
    Returns:
        bool: 删除成功返回 True，失败返回 False
    """
    # 先将该文件夹下的文件设置为无文件夹
    update_query = """
    UPDATE files
    SET folder_id = NULL
    WHERE folder_id = %s
    """
    
    # 然后删除文件夹
    delete_query = """
    DELETE FROM folders
    WHERE id = %s
    """
    
    params = (folder_id,)
    
    try:
        execute_query(update_query, params, fetch=False)
        rowcount = execute_query(delete_query, params, fetch=False)
        success = rowcount > 0
        if success:
            logging.info(f"文件夹记录删除成功: {folder_id}")
        else:
            logging.warning(f"文件夹记录未找到: {folder_id}")
        return success
    except Exception as e:
        logging.error(f"文件夹记录删除失败: {e}")
        return False 