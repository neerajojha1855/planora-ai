import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

_password_hasher = PasswordHash((Argon2Hasher(),))

def hash_password(password: str) -> str:
    return _password_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _password_hasher.verify(plain_password, hashed_password)

def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_session_token(lifetime_seconds: int=86400) -> tuple[str, str, datetime]:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_session_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=lifetime_seconds)

    return raw_token, token_hash, expires_at