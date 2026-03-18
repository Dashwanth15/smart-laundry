"""Create a user directly in MongoDB. Usage:

python create_user.py --email you@example.com --password secret --name Joe

Requires MONGO_URI env set or .env file.
"""
import argparse
import os
from db import init_db, users_collection
from werkzeug.security import generate_password_hash


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--name', default='')
    args = parser.parse_args()

    init_db()
    users = users_collection()
    hashed = generate_password_hash(args.password)
    try:
        res = users.insert_one({'email': args.email, 'password': hashed, 'name': args.name})
        print('created:', getattr(res, 'inserted_id', None))
    except Exception as e:
        print('error:', e)


if __name__ == '__main__':
    main()
