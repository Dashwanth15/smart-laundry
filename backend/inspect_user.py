"""Inspect a user in staff or users collection without revealing password value.
Usage:
  python inspect_user.py --email someone@example.com
"""
import argparse
from db import init_db, get_collection, users_collection
import os


def looks_hashed(pw: str) -> bool:
    if not pw or not isinstance(pw, str):
        return False
    return pw.startswith('pbkdf2:') or ':' in pw and '$' in pw


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    args = parser.parse_args()

    init_db()
    staff = get_collection('staff')
    user = staff.find_one({'email': args.email})
    if user:
        print('found in staff')
        print('id:', user.get('_id'))
        print('name:', user.get('name'))
        print('password present:', bool(user.get('password')))
        print('password looks hashed:', looks_hashed(user.get('password')))
        return
    u = users_collection().find_one({'email': args.email})
    if u:
        print('found in users')
        print('id:', u.get('_id'))
        print('name:', u.get('name'))
        print('password present:', bool(u.get('password')))
        print('password looks hashed:', looks_hashed(u.get('password')))
        return
    print('user not found')


if __name__ == '__main__':
    main()
