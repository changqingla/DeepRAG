from flask import Flask, request, jsonify
import jwt
import logging
from functools import wraps
import pymysql

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置项 - 必须与主RAGFlow后端一致
JWT_SECRET_KEY = "your_ragflow_jwt_secret_key_here"  # 替换为实际密钥
API_KEY_SERVICE_PORT = 5001  # 建议使用不同端口与generate_api.py区分

def query_api_key_from_db(tenant_id):
    """从 api_token 表查询真实的 API Key"""
    try:
        # 连接数据库（参数来自你的数据库结构.md）
        connection = pymysql.connect(
            host='10.0.1.4',      # 或使用 MYSQL_HOST='mysql' 如果通过Docker连接
            user='root',
            password='infini_rag_flow',
            database='rag_flow',
            port=5455,
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with connection.cursor() as cursor:
            # 执行查询（根据 api_token 表结构）
            sql = """
                SELECT token 
                FROM api_token 
                WHERE tenant_id = %s 
                ORDER BY create_date DESC 
                LIMIT 1
            """
            cursor.execute(sql, (tenant_id,))
            result = cursor.fetchone()
            return result['token'] if result else None
            
    except Exception as e:
        logger.error(f"Database query failed: {str(e)}")
        return None
    finally:
        if connection:
            connection.close()

def jwt_required(f):
    """JWT认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"code": 401, "msg": "Missing or invalid Authorization header"}), 401
            
        try:
            token = auth_header.split()[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload.get('user_id')  # 假设JWT包含user_id声明
        except jwt.ExpiredSignatureError:
            return jsonify({"code": 401, "msg": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"code": 401, "msg": "Invalid token"}), 401
        except Exception as e:
            logger.error(f"JWT validation error: {str(e)}")
            return jsonify({"code": 500, "msg": "Token validation failed"}), 500
            
        return f(*args, **kwargs)
    return decorated_function

@app.route('/v1/me/api-key', methods=['GET'])
@jwt_required
def get_user_api_key():
    """获取用户专属API Key"""
    try:
        # 1. 从JWT中获取用户身份标识 (tenant_id)
        tenant_id = request.user_id
        if not tenant_id:
            return jsonify({"code": 400, "msg": "User identity not found in token"}), 400

        # 2. 查询数据库获取API Key
        api_key = query_api_key_from_db(tenant_id)
        if not api_key:
            return jsonify({"code": 404, "msg": "API key not found for this user"}), 404

        # 3. 返回API Key
        return jsonify({
            "code": 0,
            "msg": "Success",
            "data": {
                "api_key": api_key,
                "tenant_id": tenant_id
            }
        })

    except Exception as e:
        logger.error(f"Failed to get user API key: {str(e)}")
        return jsonify({"code": 500, "msg": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=API_KEY_SERVICE_PORT, debug=True)
