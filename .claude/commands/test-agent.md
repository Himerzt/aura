# /test-agent [agent_number] [test_input]

Dùng lệnh này để test từng agent riêng lẻ trước khi ghép pipeline.

## Cách dùng

```
/test-agent 1 "hôm nay tôi rất mệt không muốn làm gì cả"
/test-agent 2 (dùng output giả của agent 1)
/test-agent 3 energy=3
/test-agent 4 "hôm nay tôi làm được 1 việc"
```

## Hướng dẫn cho Claude Code

Tạo script Python tạm thời `test_agent_X.py` trong thư mục `backend/`:

```python
import asyncio
import json
import os
from agents.wellness_check import run_wellness_check  # thay tên agent

async def test():
    result = await run_wellness_check(
        user_input="[TEST_INPUT]",
        time_of_day="morning"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))

asyncio.run(test())
```

Chạy: `docker-compose exec backend python test_agent_X.py`

**Kiểm tra:**
- [ ] Output là valid JSON
- [ ] Tất cả required fields có mặt
- [ ] Giá trị hợp lệ (energy 1-10, mood_state đúng enum...)
- [ ] Tiếng Việt đúng trong explanation fields

Xóa script test sau khi xong.
