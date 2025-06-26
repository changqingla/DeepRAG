from flask import Flask, request, jsonify
import logging
from generate import login_and_get_auth_header, create_api_key_with_auth_header

app = Flask(__name__)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 