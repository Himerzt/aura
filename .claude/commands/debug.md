# /debug [error_description]

Dùng khi gặp lỗi. Paste error message vào sau lệnh này.

## Hướng dẫn cho Claude Code

### Bước 1 — Thu thập thông tin

```bash
# Backend logs
docker-compose logs backend --tail=50

# Frontend logs  
docker-compose logs frontend --tail=30

# Nginx logs
docker-compose logs nginx --tail=20

# Tất cả cùng lúc
docker-compose logs --tail=20
```

### Bước 2 — Phân tích lỗi phổ biến

| Triệu chứng | Nguyên nhân có thể | Cách fix |
|-------------|-------------------|---------|
| `502 Bad Gateway` | Backend crash khi start | Xem `docker-compose logs backend` |
| `ModuleNotFoundError` | Import path sai trong Docker | Đổi `from backend.xxx` → `from xxx` |
| `JSONDecodeError` | Gemini trả markdown thay vì JSON | Strip ` ```json ` trước khi parse |
| `Connection refused` | Service chưa sẵn sàng | Thêm `depends_on` hoặc retry logic |
| `CORS error` | Missing CORS middleware | Kiểm tra `allow_origins` trong FastAPI |
| `TypeError: undefined` | Frontend nhận null từ API | Kiểm tra optional chaining `?.` |

### Bước 3 — Nếu kẹt lần 2 cùng vấn đề

**Dừng lại. Không patch tiếp.**

Thay vào đó: mô tả vấn đề cho user, đề xuất approach khác hoàn toàn.

Ví dụ: nếu Gemini JSON parsing kẹt lần 2 → đổi sang dùng response_format hoặc explicit JSON schema trong prompt.
