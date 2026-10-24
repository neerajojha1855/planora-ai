import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

class SlidingWindowRateLimiter:
    """In-memory IP-based sliding window rate limiter"""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
    
    def reset(self) -> None:
        self.requests.clear()
    
    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        self.requests[client_ip] = [ts for ts in self.requests[client_ip] if ts > window_start]

        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many authentication attempts. Please wait a minute before trying again")
        
        self.requests[client_ip].append(now)

auth_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)