"""
Append 5 personalized morning-to-evening demo days to AURA history.

Run from project root:
    python backend/scripts/append_5_day_pipeline_history.py

This keeps the existing history, backs it up, then adds five consecutive days
after the current last date. The entries follow the same saved shape produced
by the morning pipeline and evening reflection endpoint.
"""

import argparse
import json
import shutil
from datetime import date, datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
HISTORY_FILE = DATA_DIR / "history.json"
BACKUP_FILE = DATA_DIR / "history.before_append_5_days.json.bak"


def load_history() -> dict:
    if not HISTORY_FILE.exists():
        return {}
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def task(
    title: str,
    implementation: str,
    minutes: int,
    difficulty: str,
    completed: bool,
    created_at: str,
    first_action_at: str | None,
    post_emotion: str | None,
    friction: str | None = None,
    delay: int | None = None,
) -> dict:
    return {
        "title": title,
        "implementation": implementation,
        "estimated_minutes": minutes,
        "difficulty": difficulty,
        "completed": completed,
        "post_emotion": post_emotion,
        "friction": friction,
        "first_action_at": first_action_at,
        "first_action_delay_minutes": delay,
        "replaced_from": None,
        "created_at": created_at,
    }


def build_entries(start: date, first_streak: int) -> dict:
    days = {}
    specs = [
        {
            "mood_state": "overwhelmed",
            "energy_level": 3,
            "framework": "self_compassion",
            "pattern": "Social eating guilt after a weekend meal, with all-or-nothing thinking",
            "morning": (
                "Hôm qua đi ăn với bạn nên ăn nhiều hơn dự tính. Sáng nay hơi nặng bụng "
                "và thấy có lỗi, kiểu mất công mấy ngày trước rồi giờ phá hết."
            ),
            "explanation": (
                "Đây là vòng lặp xấu hổ sau một bữa ăn lệch kế hoạch. Một bữa ăn không xóa "
                "đi chuỗi hành động tốt đã có. Hôm nay ưu tiên quay lại nhịp nhẹ, không phạt bản thân."
            ),
            "tasks": [
                task(
                    "Viết lại một câu tự nói tử tế sau bữa ăn lệch kế hoạch",
                    "Sau cà phê sáng, tôi mở Notes và viết đúng 1 câu: một bữa ăn không quyết định cả hành trình.",
                    5,
                    "very_easy",
                    True,
                    "08:00:00",
                    "08:07:00",
                    "relieved",
                    delay=7,
                ),
                task(
                    "Đi bộ 10 phút sau bữa trưa, không bù trừ bằng nhịn ăn",
                    "Ngay khi ăn trưa xong, tôi đi bộ nhẹ 10 phút quanh văn phòng rồi uống nước.",
                    10,
                    "easy",
                    True,
                    "08:00:00",
                    "12:38:00",
                    "neutral",
                    delay=278,
                ),
            ],
            "evening": (
                "Sáng vẫn hơi tự trách nhưng viết câu đó xong dịu xuống. Trưa đi bộ được, "
                "tối ăn bình thường chứ không nhịn để bù. Cảm giác mình không bị kéo vào vòng tội lỗi như trước."
            ),
            "summary": (
                "Ngày phục hồi sau social eating: nhận ra shame spiral sớm, quay lại bằng self-compassion "
                "và một hành động nhỏ thay vì cực đoan hóa ăn uống."
            ),
            "pattern_detected": True,
            "question": "Ngày mai nếu cân nặng hoặc cảm giác cơ thể chưa như ý, bạn muốn phản ứng tử tế thế nào?",
        },
        {
            "mood_state": "energized",
            "energy_level": 7,
            "framework": "progress_principle",
            "pattern": "Momentum returning after a compassionate reset",
            "morning": (
                "Ngủ khá hơn, sáng thấy nhẹ người. Hôm qua không hoàn hảo nhưng không bỏ cuộc. "
                "Hôm nay muốn tận dụng năng lượng này để chuẩn bị bữa ăn và tập nhẹ."
            ),
            "explanation": (
                "Năng lượng đang lên sau khi bạn không tự phạt mình. Progress Principle hợp hôm nay: "
                "tạo vài bằng chứng cụ thể rằng hệ thống vẫn đang chạy."
            ),
            "tasks": [
                task(
                    "Chuẩn bị sẵn 2 phần protein cho trưa và tối",
                    "Trước 9h, tôi luộc trứng hoặc chuẩn bị ức gà/cá hộp để bữa chính không bị quyết định bởi đói quá.",
                    20,
                    "medium",
                    True,
                    "07:30:00",
                    "07:50:00",
                    "relieved",
                    delay=20,
                ),
                task(
                    "Tập 20 phút full-body nhẹ",
                    "Sau giờ làm, tôi thay đồ tập ngay trước khi tắm tối và tập 3 vòng squat, push-up nghiêng, plank.",
                    20,
                    "medium",
                    True,
                    "07:30:00",
                    "18:25:00",
                    "energized",
                    delay=655,
                ),
                task(
                    "Log bữa ăn trong app ngay sau bữa tối",
                    "Ăn tối xong đặt chén xuống là mở app log nhanh, không cần chính xác tuyệt đối.",
                    5,
                    "easy",
                    False,
                    "07:30:00",
                    None,
                    None,
                    "forgot",
                ),
            ],
            "evening": (
                "Tập được 20 phút nên rất vui. Chuẩn bị protein giúp đỡ ăn vặt hẳn. Quên log app sau bữa tối, "
                "nhưng lần này không thấy nó là thất bại lớn."
            ),
            "summary": (
                "Ngày năng lượng cao: hoàn thành chuẩn bị bữa ăn và tập luyện. Miss một task nhỏ nhưng không kéo theo "
                "self-criticism, cho thấy khả năng phục hồi đang tốt hơn."
            ),
            "pattern_detected": False,
            "question": "Task nào đáng được giữ lại như một anchor vì nó giúp cả ngày dễ hơn rõ rệt?",
        },
        {
            "mood_state": "anxious",
            "energy_level": 4,
            "framework": "implementation_intention",
            "pattern": "Meeting-heavy day disrupting food and movement plans",
            "morning": (
                "Hôm nay lịch họp dày từ sáng tới chiều. Mình sợ đến cuối ngày đói quá lại đặt đồ ăn nhanh, "
                "và chắc không có thời gian tập."
            ),
            "explanation": (
                "Đây không phải thiếu ý chí mà là ngày có nhiều ràng buộc môi trường. Implementation Intention giúp đặt "
                "trước điểm hành động: nếu họp chen kín, thì vẫn có lựa chọn nhỏ đã chuẩn bị."
            ),
            "tasks": [
                task(
                    "Đặt sẵn bữa trưa cân bằng trước 10h30",
                    "Ngay sau meeting đầu tiên, tôi đặt món có protein và rau trước 10h30 để không quyết định khi quá đói.",
                    5,
                    "easy",
                    True,
                    "08:10:00",
                    "10:18:00",
                    "relieved",
                    delay=128,
                ),
                task(
                    "Đi bộ 7 phút giữa hai cuộc họp",
                    "Khi meeting 15h kết thúc, tôi không mở Slack ngay mà đi bộ quanh tầng 7 phút.",
                    7,
                    "very_easy",
                    False,
                    "08:10:00",
                    None,
                    None,
                    "distracted",
                ),
            ],
            "evening": (
                "Đặt bữa trưa trước nên không bị đặt đồ chiên. Nhưng chiều họp kéo dài, xong mở Slack luôn nên quên đi bộ. "
                "Mệt, nhưng ít nhất phần ăn uống không vỡ."
            ),
            "summary": (
                "Ngày áp lực cao: kế hoạch ăn uống được bảo vệ nhờ đặt trước, còn movement bị trôi vì context switching. "
                "Dữ liệu cho thấy cần cue rõ hơn giữa các meeting."
            ),
            "pattern_detected": True,
            "question": "Ngày mai có thể đặt cue nào ngay sau meeting để không bị Slack kéo đi mất?",
        },
        {
            "mood_state": "numb",
            "energy_level": 2,
            "framework": "behavioral_activation",
            "pattern": "Low-energy flatness after accumulated work stress",
            "morning": (
                "Sáng nay dậy rất đuối, không buồn làm gì. Không hẳn buồn, chỉ thấy trống và nặng. "
                "Muốn bỏ qua mọi thứ một ngày."
            ),
            "explanation": (
                "Cơ thể có vẻ đang đòi giảm tải sau vài ngày căng. Behavioral Activation hôm nay không nhằm năng suất, "
                "chỉ cần một hành động rất nhỏ để giữ liên hệ với bản thân."
            ),
            "tasks": [
                task(
                    "Mở cửa sổ và đứng hít thở 3 phút",
                    "Sau khi rửa mặt, tôi mở cửa sổ, đứng yên 3 phút và chỉ chú ý hơi thở, không cầm điện thoại.",
                    3,
                    "very_easy",
                    True,
                    "08:30:00",
                    "08:45:00",
                    "neutral",
                    delay=15,
                )
            ],
            "evening": (
                "Hôm nay đúng là low-energy. Chỉ làm được task mở cửa sổ, còn lại làm việc tối thiểu. "
                "Nhưng không ăn vặt quá nhiều và không nằm lướt điện thoại cả tối."
            ),
            "summary": (
                "Ngày năng lượng thấp nhưng không mất nhịp hoàn toàn. Một task rất nhỏ giúp giữ streak tinh thần, "
                "đồng thời giảm kỳ vọng để tránh shame spiral."
            ),
            "pattern_detected": False,
            "question": "Khi năng lượng chỉ ở mức 2/10, dấu hiệu nhỏ nào cho biết bạn vẫn đang chăm sóc mình?",
        },
        {
            "mood_state": "stable",
            "energy_level": 6,
            "framework": "habit_stacking",
            "pattern": "Stabilizing routine by stacking food logging onto an existing evening anchor",
            "morning": (
                "Hôm qua nghỉ nhẹ nên hôm nay đỡ hơn. Nhận ra cái hay quên nhất là log bữa tối. "
                "Mình muốn gắn nó vào việc tắm tối vì đó là anchor khá chắc."
            ),
            "explanation": (
                "Bạn đang chuyển từ cố nhớ sang thiết kế hệ thống. Habit Stacking phù hợp: sau anchor tắm tối, "
                "log bữa ăn 2 phút trước khi lên giường."
            ),
            "tasks": [
                task(
                    "Đi bộ 15 phút sau cà phê sáng",
                    "Uống cà phê xong, tôi mang giày ngay và đi bộ 15 phút trước khi mở laptop.",
                    15,
                    "easy",
                    True,
                    "07:45:00",
                    "08:02:00",
                    "relieved",
                    delay=17,
                ),
                task(
                    "Log bữa tối ngay sau khi tắm",
                    "Tắm tối xong, trước khi lên giường, tôi mở app và log bữa tối trong 2 phút.",
                    2,
                    "very_easy",
                    True,
                    "07:45:00",
                    "21:35:00",
                    "neutral",
                    delay=830,
                ),
            ],
            "evening": (
                "Đi bộ lại bình thường. Log sau khi tắm dễ hơn hẳn vì không phải nhớ ngay lúc ăn. "
                "Cảm giác hệ thống đang tìm được chỗ cài vào đời sống thật."
            ),
            "summary": (
                "Ngày ổn định: habit stacking giúp task hay quên trở nên tự nhiên hơn. Dữ liệu cá nhân hóa mới: "
                "tắm tối là anchor mạnh cho food logging."
            ),
            "pattern_detected": False,
            "question": "Anchor tắm tối còn có thể gắn thêm thói quen nhỏ nào mà không làm bạn thấy quá tải?",
        },
    ]

    for i, spec in enumerate(specs):
        current = start + timedelta(days=i)
        day = current.isoformat()
        streak = first_streak + i

        day_tasks = []
        for item in spec["tasks"]:
            copied = dict(item)
            copied["created_at"] = f"{day}T{copied['created_at']}"
            if copied["first_action_at"]:
                copied["first_action_at"] = f"{day}T{copied['first_action_at']}"
            day_tasks.append(copied)

        days[day] = {
            "morning": {
                "user_input": spec["morning"],
                "mood_state": spec["mood_state"],
                "energy_level": spec["energy_level"],
                "pattern": spec["pattern"],
                "framework": spec["framework"],
                "explanation": spec["explanation"],
                "tasks": day_tasks,
            },
            "evening": {
                "user_input": spec["evening"],
                "summary": spec["summary"],
                "pattern_detected": spec["pattern_detected"],
                "tomorrow_question": spec["question"],
            },
            "streak_day": streak,
        }

    return days


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ending-today",
        action="store_true",
        help="Write the 5-day sequence into the current 7-day personalization window.",
    )
    args = parser.parse_args()

    history = load_history()
    if HISTORY_FILE.exists():
        backup_file = DATA_DIR / (
            "history.before_append_5_days."
            f"{datetime.now().strftime('%Y%m%d%H%M%S')}.json.bak"
        )
        shutil.copy2(HISTORY_FILE, backup_file)
    else:
        backup_file = BACKUP_FILE

    existing_dates = sorted(date.fromisoformat(k) for k in history.keys())
    if args.ending_today:
        start = date.today() - timedelta(days=4)
    else:
        start = (existing_dates[-1] + timedelta(days=1)) if existing_dates else date.today()
    last_streak = max((v.get("streak_day", 0) for v in history.values()), default=0)
    additions = build_entries(start, last_streak + 1)

    for key, value in additions.items():
        history[key] = value

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(history.items())), f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Backed up history to {backup_file}")
    print(f"Appended {len(additions)} days: {min(additions)} to {max(additions)}")
    print(f"History now has {len(history)} days")
    for key in sorted(additions):
        morning = additions[key]["morning"]
        evening = additions[key]["evening"]
        completed = sum(1 for t in morning["tasks"] if t.get("completed"))
        total = len(morning["tasks"])
        print(
            f"{key}: {morning['mood_state']} energy={morning['energy_level']} "
            f"framework={morning['framework']} tasks={completed}/{total} "
            f"reflection_pattern={evening['pattern_detected']}"
        )


if __name__ == "__main__":
    main()
