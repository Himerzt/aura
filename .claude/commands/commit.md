# /commit [part_number] [part_name]

Dùng sau khi hoàn thành và approve một phần.

## Hướng dẫn cho Claude Code

Chạy theo thứ tự:

```bash
# 1. Kiểm tra những gì sẽ commit
git status
git diff --stat

# 2. Stage tất cả
git add .

# 3. Commit với message chuẩn
git commit -m "phan-[N]: [ten phan ngan gon]"

# Ví dụ:
# git commit -m "phan-1: docker-structure-and-health-endpoint"
# git commit -m "phan-3: four-agents-and-morning-pipeline"
# git commit -m "phan-5: design-system-and-base-components"
```

## Sau khi commit

Cập nhật `docs/plan.md`:
- Đổi `- [ ]` thành `- [x]` cho tất cả success criteria của phần vừa xong
- Đổi status của phần đó thành `✅ DONE`

Báo lại: "Phần [N] đã commit. Sẵn sàng cho Phần [N+1]."

**Nhắc nhở:** Nếu đây là Phần 2, 4, hoặc 6 → nhắc user mở chat mới trước khi tiếp tục.
