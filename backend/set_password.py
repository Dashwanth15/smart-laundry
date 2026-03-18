from app import create_app
from werkzeug.security import generate_password_hash
from db import users_collection, get_collection

def change_password(email, new_password):
    # Check both staff and users collections
    staff = get_collection('staff')
    users = users_collection()
    
    # Try staff collection first
    user = staff.find_one({'email': email})
    collection = staff
    
    # If not in staff, try users collection
    if not user:
        user = users.find_one({'email': email})
        collection = users
    
    if not user:
        print(f"No user found with email: {email}")
        return False
        
    # Generate new password hash
    hashed = generate_password_hash(new_password)
    
    # Update the password
    result = collection.update_one(
        {'email': email},
        {'$set': {'password': hashed}}
    )
    
    if result.modified_count > 0:
        print(f"Password updated successfully for {email}")
        return True
    else:
        print("Password update failed")
        return False

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Change user password')
    parser.add_argument('--email', required=True, help='User email')
    parser.add_argument('--password', required=True, help='New password')
    
    args = parser.parse_args()
    
    # Initialize the app context for database connection
    app = create_app()
    with app.app_context():
        change_password(args.email, args.password)
