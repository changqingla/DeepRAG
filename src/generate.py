import requests
import json
import logging
import os
import base64

try:
    from Crypto.PublicKey import RSA
    from Crypto.Cipher import PKCS1_v1_5 as Cipher_pkcs1_v1_5
except ImportError:
    # Fallback or error if pycryptodome structure isn't used
    # This might happen if 'Crypto' refers to the old pycrypto
    logging.error("Pycryptodome not found or import structure differs. Please ensure 'pycryptodome' is installed.")
    # Depending on the actual import path if different:
    # from Cryptodome.PublicKey import RSA
    # from Cryptodome.Cipher import PKCS1_v1_5 as Cipher_pkcs1_v1_5
    raise 

# --- Configuration ---
# !!! PLEASE REPLACE with your actual RAGFlow API base URL !!!
BASE_URL = "http://10.0.1.4:8088/v1" 
EMAIL = "dudu@dudu.com"
PASSWORD = "123456" 
# Disable SSL warnings if using self-signed certificates (--insecure equivalent)
# Be cautious using verify=False in production environments
VERIFY_SSL = False 
if not VERIFY_SSL:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Frontend RSA Public Key (from web/src/utils/index.ts) ---
# Make sure this matches the key used by the frontend
FRONTEND_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArq9XTUSeYr2+N1h3Afl/
z8Dse/2yD0ZGrKwx+EEEcdsBLca9Ynmx3nIB5obmLlSfmskLpBo0UACBmB5rEjBp
2Q2f3AG3Hjd4B+gNCG6BDaawuDlgANIhGnaTLrIqWrrcm4EMzJOnAOI1fgzJRsOO
UEfaS318Eq9OVO3apEyCCt0lOQK6PuksduOjVxtltDav+guVAA068NrPYmRNabVK
RNLJpL8w4D44sfth5RvZ3q9t+6RTArpEtc5sh5ChzvqPOzKGMXW83C95TxmXqpbK
6olN4RevSfVjEAgCydH6HN6OhtOQEcnrU97r9H0iZOWwbw3pVrZiUkuRD1R56Wzs
2wIDAQAB
-----END PUBLIC KEY-----"""

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- API Endpoints ---
LOGIN_URL = f"{BASE_URL}/user/login" # Use the standard login endpoint
CREATE_TOKEN_URL = f"{BASE_URL}/system/new_token"

def string_to_bytes(string):
    """Helper to convert string to bytes"""
    return string if isinstance(string, bytes) else string.encode(encoding="utf-8")

def encrypt_password(password):
    """Simulates the frontend encryption: RSA(Base64(password))"""
    try:
        # 1. Base64 encode the password
        b64_encoded_password = base64.b64encode(string_to_bytes(password))
        
        # 2. Encrypt using RSA public key
        pub_key = RSA.importKey(FRONTEND_PUBLIC_KEY)
        cipher = Cipher_pkcs1_v1_5.new(pub_key)
        encrypted_data = cipher.encrypt(b64_encoded_password)
        
        # 3. Base64 encode the encrypted result (as the backend decrypt expects b64 encoded input)
        b64_encrypted_data = base64.b64encode(encrypted_data)
        
        return b64_encrypted_data.decode('utf-8')
    except Exception as e:
        logging.error(f"Password encryption failed: {e}")
        return None

def login_and_get_auth_header(email, password):
    """Logs in using the standard endpoint and returns the Authorization header value."""
    logging.info(f"Attempting login for user: {email} using standard /login endpoint")
    
    encrypted_pwd = encrypt_password(password)
    if not encrypted_pwd:
        return None # Encryption failed
        
    payload = {
        "email": email,
        "password": encrypted_pwd # Send the encrypted password
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        # Use standard requests.post, not session
        response = requests.post(LOGIN_URL, headers=headers, json=payload, verify=VERIFY_SSL)
        response.raise_for_status() 
        
        response_data = response.json()
        
        # Check if login was successful server-side (code 0)
        if response_data.get("code") == 0:
            # Extract the Authorization header from the RESPONSE headers
            auth_header = response.headers.get("Authorization")
            if auth_header:
                 logging.info("Login successful. Authorization header obtained from response.")
                 return auth_header # Return the header value
            else:
                 logging.error("Login successful (API code 0), but 'Authorization' header missing in response.")
                 return None
        else:
            logging.error(f"Login failed. API response: {response_data}")
            return None
            
    except requests.exceptions.RequestException as e:
        logging.error(f"Login request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
             logging.error(f"Response text: {e.response.text}")
        return None
    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON response from login endpoint: {response.text}")
        return None

def create_api_key_with_auth_header(auth_header_value):
    """Attempts to create a general API key using the provided Authorization header value."""
    if not auth_header_value:
        logging.error("Cannot create API key without a valid Authorization header value.")
        return None
        
    logging.info("Attempting to create a general API key using Authorization header...")
    headers = {
        "Authorization": auth_header_value, # Use the extracted header value
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {} # No data needed for /system/new_token

    try:
        # Use standard requests.post
        response = requests.post(CREATE_TOKEN_URL, headers=headers, json=payload, verify=VERIFY_SSL)
        
        response.raise_for_status() # Raise an exception for bad status codes
        
        response_data = response.json()
        
        if response_data.get("code") == 0 and "data" in response_data and "token" in response_data["data"]:
            api_key = response_data["data"]["token"]
            logging.info(f"Successfully created API Key: {api_key}")
            # Print details
            print("\n--- API Key Details ---")
            print(f"API Key (token): {api_key}")
            print(f"Tenant ID: {response_data['data'].get('tenant_id')}")
            print(f"Beta Value: {response_data['data'].get('beta')}")
            print(f"Created Date: {response_data['data'].get('create_date')}")
            print("-----------------------\n")
            return api_key
        else:
            # Log specific error if 401 Unauthorized, otherwise general failure
            if response.status_code == 401 or response_data.get("code") == 401:
                 logging.error("API key creation failed (401 Unauthorized). The provided Authorization token was likely invalid or expired.")
            else:
                 logging.error(f"API key creation failed. API response: {response_data}")
            return None

    except requests.exceptions.RequestException as e:
        logging.error(f"Create API key request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
             logging.error(f"Response text: {e.response.text}")
        return None
    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON response from create token endpoint: {response.text}")
        return None

# --- Main Execution ---
if __name__ == "__main__":
    # Login and get the required Authorization header value
    auth_token = login_and_get_auth_header(EMAIL, PASSWORD) 
    
    if auth_token:
        created_key = create_api_key_with_auth_header(auth_token) 
        if created_key:
            print("Script finished successfully.")
        else:
            print("Script finished: Failed to create API key after successful login.")
    else:
        print("Script finished: Login failed or failed to retrieve Authorization header.")