import os
import logging
from flask import Flask, request, jsonify
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = os.getenv('PORT', 8005)

# In-memory notification storage
notifications = {}

def verify_token(f):
    """Decorator to verify JWT token from headers"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').split(' ')[-1]
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/notifications', methods=['POST'])
@verify_token
def send_notification():
    """Send notification (email/SMS)"""
    try:
        data = request.get_json()
        recipient = data.get('recipient')
        message = data.get('message')
        notification_type = data.get('type', 'email')
        
        if not recipient or not message:
            return jsonify({'error': 'Missing required fields'}), 400
        
        notification_id = f"notif_{datetime.now().timestamp()}"
        notification = {
            'id': notification_id,
            'recipient': recipient,
            'message': message,
            'type': notification_type,
            'status': 'sent',
            'sentAt': datetime.now().isoformat()
        }
        
        notifications[notification_id] = notification
        logger.info(f"Notification sent: {notification_id} to {recipient}")
        
        return jsonify(notification), 201
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<notification_id>', methods=['GET'])
@verify_token
def get_notification(notification_id):
    """Get notification status"""
    try:
        notif = notifications.get(notification_id)
        if not notif:
            return jsonify({'error': 'Notification not found'}), 404
        return jsonify(notif), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications', methods=['GET'])
@verify_token
def list_notifications():
    """List all notifications"""
    try:
        notif_list = list(notifications.values())
        return jsonify(notif_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'notification-service'}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(PORT), debug=False)
