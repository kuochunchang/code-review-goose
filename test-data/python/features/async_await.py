import asyncio

async def fetch_data(url: str) -> str:
    await asyncio.sleep(1)
    return f"Data from {url}"

class AsyncProcessor:
    async def process_urls(self, urls: list[str]):
        tasks = [fetch_data(url) for url in urls]
        return await asyncio.gather(*tasks)
