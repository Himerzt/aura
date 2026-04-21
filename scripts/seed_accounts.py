"""
AURA Seed Script — 2 tài khoản test với dữ liệu history thực tế.

Usage:
    python scripts/seed_accounts.py 1    # Hành trình giảm cân (10 ngày)
    python scripts/seed_accounts.py 2    # Định hướng nghề nghiệp (30 ngày)
    python scripts/seed_accounts.py all  # Cả hai

Ghi vào backend/data/profile.json, history.json, và aura.db (auth accounts).
"""

import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Add backend to sys.path for imports
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

DATA_DIR = BACKEND_DIR / "data"
PROFILE_PATH = DATA_DIR / "profile.json"
HISTORY_PATH = DATA_DIR / "history.json"

# ── Auth seed credentials ──────────────────────────────────────────────────
SEED_ACCOUNTS = {
    1: {"email": "huy@aura.test", "password": "Aura2026!", "name": "Nguyễn Quốc Huy"},
    2: {"email": "huy2@aura.test", "password": "Aura2026!", "name": "Nguyễn Quốc Huy"},
}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  -> {path}")


def make_iso(d: date) -> str:
    return d.isoformat()


def make_dt(d: date, hour: int = 8, minute: int = 0) -> str:
    return datetime(d.year, d.month, d.day, hour, minute).isoformat(timespec="seconds")


# ============================================================================
# ACCOUNT 1: Hành trình giảm cân — 10 ngày, mood thất thường
# ============================================================================

def build_account_1() -> tuple[dict, dict]:
    today = date.today()
    d = [today - timedelta(days=10 - i) for i in range(10)]

    profile = {
        "user_id": "local_user",
        "created_at": make_iso(d[0]),
        "name": "Nguyễn Quốc Huy",
        "goal": "Giảm cân từ 87kg xuống 80kg trong 3 tháng",
        "context": "Làm văn phòng, ngồi nhiều, hay ăn vặt. Cân nặng tăng đều từ đầu năm. Muốn giảm nhưng khó kiểm soát ăn uống.",
        "past_attempts": [
            "Tự tập gym được 2 tuần rồi bỏ",
            "Ăn kiêng low-carb được 5 ngày rồi không chịu nổi",
            "Đếm calo bằng app nhưng hay quên log",
        ],
        "daily_anchors": [
            "Uống cà phê sáng",
            "Đi làm lúc 8h",
            "Tắm tối trước khi ngủ",
        ],
        "chronotype": "morning",
        "support_style": "push",
        "onboarding_completed": True,
        "bad_day_messages": [
            {
                "id": 0,
                "message": "Huy ơi, một ngày ăn nhiều không phải là thất bại. Nó chỉ là một ngày. Ngày mai mình bắt đầu lại, nhẹ nhàng hơn.",
                "author_date": make_iso(d[2]),
                "last_used_at": None,
                "use_count": 0,
            }
        ],
    }

    history = {}

    # --- Ngày 1: Khởi đầu tốt ---
    history[make_iso(d[0])] = {
        "morning": {
            "user_input": "Hôm nay quyết tâm giảm cân nha! 87.5kg rồi, phải xuống. Hôm qua sai rồi, nay ráng lên.",
            "mood_state": "energized",
            "energy_level": 7,
            "pattern": "Overconfidence after a setback — high determination but fragile motivation",
            "framework": "implementation_intention",
            "explanation": "Bạn đang ở trạng thái quyết tâm cao sau một ngày sai — đây là lúc tốt để đặt kế hoạch cụ thể. Thay vì chỉ 'quyết tâm', hãy biến nó thành hành động rõ ràng: 'Khi nào thì làm gì'.",
            "tasks": [
                {
                    "title": "Đếm calo bữa trưa — chụp ảnh trước khi ăn",
                    "implementation": "Khi ngồi xuống ăn trưa lúc 12h, tôi sẽ chụp ảnh món ăn và ghi số calo vào app trước khi bắt đầu ăn.",
                    "estimated_minutes": 5,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[0], 7, 30),
                    "first_action_at": make_dt(d[0], 12, 5),
                    "first_action_delay_minutes": 275,
                },
                {
                    "title": "Đi bộ 10.000 bước hôm nay",
                    "implementation": "Sau bữa trưa, tôi sẽ đi bộ 15 phút quanh công ty. Chiều về nhà, tôi sẽ đi bộ thêm 20 phút quanh khu phố.",
                    "estimated_minutes": 35,
                    "difficulty": "medium",
                    "completed": True,
                    "created_at": make_dt(d[0], 7, 30),
                    "first_action_at": make_dt(d[0], 12, 30),
                    "first_action_delay_minutes": 300,
                },
                {
                    "title": "Uống 2 lít nước trong ngày",
                    "implementation": "Đặt bình nước 500ml trên bàn. Mỗi lần hết bình, đổ thêm ngay. Mục tiêu: 4 bình.",
                    "estimated_minutes": 5,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[0], 7, 30),
                },
            ],
        },
        "evening": {
            "user_input": "Nay làm tốt á, oke mới sai có một ngày thôi ráng lên. Bún bò 1000 calo, cơm trưa 400, cơm tối 500. Tổng 1900 calo. 10000 bước chân.",
            "summary": "Một ngày kỷ luật tốt — 1900 calo, 10000 bước, uống đủ nước. Quyết tâm đang cao, cần giữ nhịp này.",
            "pattern_detected": False,
            "tomorrow_question": "Nếu ngày mai bạn bị cám dỗ bởi món ăn yêu thích, bạn sẽ xử lý thế nào?",
        },
        "streak_day": 1,
    }

    # --- Ngày 2: Bắt đầu trượt ---
    history[make_iso(d[1])] = {
        "morning": {
            "user_input": "87.5kg. Hôm qua ăn oke, nay tiếp tục.",
            "mood_state": "stable",
            "energy_level": 5,
            "pattern": "Stable but complacent — yesterday's success may breed today's slack",
            "framework": "habit_stacking",
            "explanation": "Bạn đã làm tốt hôm qua. Nhưng cứ ý 'tiếp tục' mà không cụ thể sẽ dễ bị trượt. Hãy gán việc đếm calo vào thói quen sẵn có để nó thành tự động.",
            "tasks": [
                {
                    "title": "Ghi calo NGAY sau khi ăn xong — không để đến tối",
                    "implementation": "Mỗi bữa ăn xong, trước khi rửa tay, tôi sẽ mở app và ghi số calo.",
                    "estimated_minutes": 3,
                    "difficulty": "easy",
                    "completed": False,
                    "created_at": make_dt(d[1], 7, 45),
                    "friction": {
                        "reason": "forgot",
                        "note": "Quên ghi bữa trưa, tối mới nhớ",
                        "logged_at": make_dt(d[1], 20, 0),
                    },
                },
                {
                    "title": "Chọn món ăn dưới 500 calo cho bữa tối",
                    "implementation": "Trước 5h chiều, tôi sẽ quyết định món tối và chọn món dưới 500 calo.",
                    "estimated_minutes": 5,
                    "difficulty": "easy",
                    "completed": False,
                    "created_at": make_dt(d[1], 7, 45),
                    "friction": {
                        "reason": "no_meaning",
                        "note": "Ăn cơm + bánh tráng hết 800 calo rồi",
                        "logged_at": make_dt(d[1], 21, 0),
                    },
                },
            ],
        },
        "evening": {
            "user_input": "Àu rồi, noooo. Bánh đa 900, cơm 400, cơm + bánh tráng 800. Tổng 2200 calo. Vượt rồi.",
            "summary": "Ngày trượt — 2200 calo, vượt 300 so với mục tiêu. Không ghi calo kịp thời, chỉ nhớ lúc tối. Bánh tráng là thủ phạm.",
            "pattern_detected": True,
            "tomorrow_question": "Bạn có muốn chuẩn bị bữa tối từ trước để tránh tình trạng ăn quá nhiều vào buổi tối không?",
        },
        "streak_day": 2,
    }

    # --- Ngày 3: Tệ hơn ---
    history[make_iso(d[2])] = {
        "morning": {
            "user_input": "85.75 - 87.5kg. Không ổn, méo ổn. Hôm qua ăn nhiều quá.",
            "mood_state": "anxious",
            "energy_level": 4,
            "pattern": "Early-stage frustration — weight fluctuation causing anxiety",
            "framework": "self_compassion",
            "explanation": "Cân nặng dao động trong ngày là bình thường (nước, muối, thức ăn chưa tiêu). Việc bạn thấy 'không ổn' là cảm xúc, không phải sự thật. Hãy đối xử với mình nhẹ nhàng hơn.",
            "tasks": [
                {
                    "title": "Viết 1 câu tốt đẹp về bản thân liên quan đến sức khỏe",
                    "implementation": "Trước khi mở app đếm calo, tôi sẽ viết 1 câu: 'Mình đang cố gắng, và đó là đủ.'",
                    "estimated_minutes": 3,
                    "difficulty": "very_easy",
                    "completed": True,
                    "created_at": make_dt(d[2], 8, 0),
                },
            ],
        },
        "evening": {
            "user_input": "Không ổn, méo ổn. Bánh đa 900, cơm + nước 800, cá viên chiên 500. Tổng 2400 calo. Phá rồi.",
            "summary": "Ngày khó khăn — 2400 calo. Nhưng bạn đã hoàn thành task tự-thương. Cân nặng lên xuống là bình thường, đừng để nó chi phối cảm xúc.",
            "pattern_detected": True,
            "tomorrow_question": "Nếu ngày mai bạn cảm thấy chán nản về cân nặng, điều nhỏ nhất bạn có thể làm là gì?",
        },
        "streak_day": 3,
    }

    # --- Ngày 4: Bỏ cuộc một phần ---
    history[make_iso(d[3])] = {
        "morning": {
            "user_input": "Không muốn track gì hết. Mệt rồi.",
            "mood_state": "numb",
            "energy_level": 2,
            "pattern": "Emotional shutdown after repeated perceived failures",
            "framework": "two_minute_rule",
            "explanation": "Bạn đang kiệt sức vì liên tục tự đánh giá. Không cần làm nhiều — chỉ cần 1 việc nhỏ nhất. 2 phút thôi.",
            "tasks": [
                {
                    "title": "Đi bộ 5 phút quanh nhà — chỉ 5 phút thôi",
                    "implementation": "Khi rời giường, trước khi làm bất cứ gì, tôi sẽ đi ra cửa và đi bộ 5 phút.",
                    "estimated_minutes": 5,
                    "difficulty": "very_easy",
                    "completed": False,
                    "created_at": make_dt(d[3], 9, 0),
                    "friction": {
                        "reason": "tired",
                        "note": "",
                        "logged_at": make_dt(d[3], 12, 0),
                    },
                },
            ],
        },
        "streak_day": 4,
    }

    # --- Ngày 5: Vẫn chán ---
    history[make_iso(d[4])] = {
        "morning": {
            "user_input": "7000 bước hôm qua. Không track đồ ăn. Chán.",
            "mood_state": "numb",
            "energy_level": 2,
            "pattern": "Avoidance pattern — tracking feels like punishment",
            "framework": "behavioral_activation",
            "explanation": "Bạn đang tránh việc track vì nó gắn với cảm giác thất bại. Nhưng hành động tạo ra cảm hứng — không phải ngược lại. Hãy làm 1 việc nhỏ mà không liên quan đến cân nặng.",
            "tasks": [
                {
                    "title": "Nấu 1 món ăn ngon mà bạn thích — không đếm calo",
                    "implementation": "Chiều nay tôi sẽ nấu 1 món mình thích, thưởng thức nó mà không suy nghĩ về calo.",
                    "estimated_minutes": 30,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[4], 9, 30),
                },
            ],
        },
        "evening": {
            "user_input": "Nấu bò kho. Ngon. Nhưng vẫn thấy tội lỗi vì không diet.",
            "summary": "Bạn đã nấu ăn và thưởng thức — đó là tốt. Cảm giác tội lỗi không giúp gì, nhưng nó là tín hiệu bạn vẫn quan tâm đến sức khỏe.",
            "pattern_detected": True,
            "tomorrow_question": "Bạn có sẵn sàng quay lại track với mục tiêu nhẹ hơn — chỉ 1 bữa thôi — không?",
        },
        "streak_day": 5,
    }

    # --- Ngày 6: Thử lại ---
    history[make_iso(d[5])] = {
        "morning": {
            "user_input": "86.15kg. Oke thử lại. Hủ tiếu sáng, cơm trưa cơm tối.",
            "mood_state": "stable",
            "energy_level": 5,
            "pattern": "Cautious restart — lower expectations this time",
            "framework": "progress_principle",
            "explanation": "Bạn đang quay lại — đó là bước tiến. Không cần hoàn hảo, chỉ cần 'tốt hơn hôm qua một chút' là đủ.",
            "tasks": [
                {
                    "title": "Track chỉ 1 bữa — bữa trưa",
                    "implementation": "Trưa nay ăn xong, tôi sẽ ghi calo bữa trưa vào sổ tay điện thoại. Chỉ 1 bữa.",
                    "estimated_minutes": 3,
                    "difficulty": "very_easy",
                    "completed": True,
                    "created_at": make_dt(d[5], 7, 30),
                },
                {
                    "title": "Đi bộ 7000 bước",
                    "implementation": "Đi bộ 10 phút sau trưa + 15 phút sau bữa tối.",
                    "estimated_minutes": 25,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[5], 7, 30),
                },
            ],
        },
        "evening": {
            "user_input": "Hủ tiếu 600, cơm trưa 400, cơm tối trứng 500. Tổng 1500. Tập nhẹ 100kcal. Oke.",
            "summary": "Ngày ổn định — 1500 calo + tập nhẹ. Quay lại track được 1 bữa, đã đi bộ. Tiến bộ nhỏ nhưng có ý nghĩa.",
            "pattern_detected": False,
            "tomorrow_question": "Ngày mai bạn muốn thử track 2 bữa thay vì 1 không?",
        },
        "streak_day": 6,
    }

    # --- Ngày 7: Ổn ---
    history[make_iso(d[6])] = {
        "morning": {
            "user_input": "86.25kg. Hôm qua track được. Nay thử 2 bữa.",
            "mood_state": "stable",
            "energy_level": 6,
            "pattern": "Building momentum — small wins accumulating",
            "framework": "habit_stacking",
            "explanation": "Bạn đã track 1 bữa thành công. Bây giờ hãy 'xếp chồng' thêm 1 bữa nữa lên thói quen đó. Làm từ từ.",
            "tasks": [
                {
                    "title": "Track 2 bữa: trưa + tối",
                    "implementation": "Sau bữa trưa và bữa tối, trước khi uống nước, tôi sẽ ghi calo.",
                    "estimated_minutes": 6,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[6], 7, 15),
                },
                {
                    "title": "Đi bộ 8000 bước",
                    "implementation": "15 phút sau trưa + 20 phút sau tối.",
                    "estimated_minutes": 35,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[6], 7, 15),
                },
            ],
        },
        "evening": {
            "user_input": "Cơm ba rọi 600, cơm trưa 450, phở tối 550. Tổng 1600. Tập 100kcal.",
            "summary": "Track 2 bữa thành công! 1600 calo — đúng mục tiêu. Đang xây lại nhịp tốt.",
            "pattern_detected": False,
            "tomorrow_question": "Bạn đã có 2 ngày ổn rồi. Ngày mai muốn giữ nguyên hay thử thêm điều gì?",
        },
        "streak_day": 7,
    }

    # --- Ngày 8–9: Bỏ lỡ ---

    # --- Ngày 10 (hôm nay hoặc hôm qua): Cân nặng tăng vọt ---
    history[make_iso(d[9])] = {
        "morning": {
            "user_input": "88.8kg. Trời ơi. Thất vọng quá. Skip 2 ngày, ăn thoải mái, giờ cân nặng vọt lên. Chuỗi đã gãy rồi.",
            "mood_state": "overwhelmed",
            "energy_level": 2,
            "pattern": "Catastrophizing after a setback — all-or-nothing thinking",
            "framework": "self_compassion",
            "explanation": "Bạn đang nhìn 88.8kg và kết luận 'thất bại hoàn toàn'. Nhưng bạn đã có 7 ngày cố gắng — đó không mất đi. Cân nặng tăng 2kg sau 2 ngày ăn nhiều là chứa nước + muối, không phải mỡ. Hãy đối xử với mình nhẹ nhàng.",
            "tasks": [
                {
                    "title": "Viết ra 3 điều bạn đã làm tốt trong 7 ngày trước",
                    "implementation": "Ngồi xuống, mở sổ tay, viết 3 việc tốt mình đã làm. Không cần nhiều — chỉ 3 thôi.",
                    "estimated_minutes": 5,
                    "difficulty": "very_easy",
                    "completed": False,
                    "created_at": make_dt(d[9], 10, 0),
                },
            ],
            "pattern_alert": {
                "pattern_name": "potential_shame_spiral",
                "severity": "medium",
                "recommended_override": "self_compassion",
                "consecutive_days": 2,
                "details": "2 ngày miss + hôm nay overwhelmed với tự-đánh giá tiêu cực",
            },
        },
        "streak_day": 8,
    }

    return profile, history


# ============================================================================
# ACCOUNT 2: Định hướng nghề nghiệp — 30 ngày, stuck trong vòng lặp
# ============================================================================

def build_account_2() -> tuple[dict, dict]:
    today = date.today()
    d = [today - timedelta(days=30 - i) for i in range(30)]

    profile = {
        "user_id": "local_user",
        "created_at": make_iso(d[0]),
        "name": "Nguyễn Quốc Huy",
        "goal": "Tìm được việc Intern/Fresher AI hoặc BA trong 3 tháng để tự lo cho bản thân",
        "context": "Mới tốt nghiệp, chưa có việc. Rất khát khao thay đổi bản thân, muốn giỏi hơn. Nhưng suốt tháng qua bị kẹt trong vòng lặp: quyết tâm -> lên kế hoạch -> làm được vài ngày -> trì hoãn -> tự dằn vặt. Có lúc tính đi chạy Be/Grab tạm để có thu nhập.",
        "past_attempts": [
            "Học khoá Python online — bỏ giữa chừng",
            "Làm CV gửi 5 công ty — không ai gọi",
            "Đọc sách self-help — đọc xong thì quên",
            "Đăng ký khoá BA — chưa bắt đầu",
        ],
        "daily_anchors": [
            "Pha cà phê sáng",
            "Lướt điện thoại trước khi ngủ",
            "Ăn cơm với gia đình trưa",
        ],
        "chronotype": "evening",
        "support_style": "gentle",
        "onboarding_completed": True,
        "bad_day_messages": [
            {
                "id": 0,
                "message": "Huy ơi, mình biết bạn đang mệt. Nhưng việc bạn mở app này hôm nay, ngồi đây đọc dòng chữ này — đó là bằng chứng bạn chưa bỏ cuộc. Không ai giỏi ngay từ đầu. Làm 1 việc nhỏ thôi, rồi nghỉ.",
                "author_date": make_iso(d[5]),
                "last_used_at": None,
                "use_count": 0,
            },
            {
                "id": 1,
                "message": "Ngày 5 trước bạn viết: 'Mình sẽ không bỏ cuộc lần nữa'. Bạn vẫn đang ở đây. Đó là đúng rồi.",
                "author_date": make_iso(d[12]),
                "last_used_at": None,
                "use_count": 0,
            },
        ],
    }

    history = {}

    # ─── TUẦN 1: QUYẾT TÂM CAO ─────────────────────────────────────────

    week1_data = [
        {
            "input": "Hôm nay là ngày đầu tiên. Mình quyết tâm thay đổi. Sẽ học AI, làm portfolio, gửi CV. Không bỏ cuộc lần nữa!",
            "mood": "energized", "energy": 8,
            "pattern": "Fresh-start effect — high motivation at beginning of new attempt",
            "framework": "implementation_intention",
            "explanation": "Quyết tâm của bạn rất lớn — hãy biến nó thành kế hoạch cụ thể. 'Sẽ học AI' thì học gì, lúc nào, bao lâu? Cụ thể hoá sẽ giúp bạn bắt đầu.",
            "tasks": [
                ("Chọn 1 khoá học AI cụ thể trên Coursera/Udemy", "Sau khi uống cà phê sáng, tôi sẽ ngồi 30 phút tìm và chọn 1 khoá học. Ghi tên khoá ra giấy.", 30, "easy", True),
                ("Làm 1 bài học đầu tiên", "Sau bữa trưa, tôi sẽ học bài 1 của khoá đã chọn. Chỉ 1 bài.", 45, "medium", True),
                ("Viết ra 3 skill mình đã có", "Trước khi ngủ, tôi sẽ viết 3 kỹ năng mình đã biết làm.", 10, "easy", True),
            ],
            "evening_input": "Wow làm được hết! Chọn khoá Machine Learning trên Coursera. Học bài 1, hiểu được. Viết 3 skill: Python cơ bản, Excel, tiếng Anh đọc hiểu. Cảm thấy tuyệt vời!",
            "evening_summary": "Ngày đầu tiên tuyệt vời — hoàn thành 3/3 task. Quyết tâm cao và hành động cụ thể. Giữ nhịp này!",
            "tomorrow_q": "Ngày mai bạn sẽ học tiếp bài 2 hay muốn làm gì khác?",
        },
        {
            "input": "Sáng nay dậy sớm, uống cà phê, sẵn sàng học tiếp. Thấy mình làm được.",
            "mood": "energized", "energy": 7,
            "pattern": "Momentum building — day 2 enthusiasm",
            "framework": "progress_principle",
            "explanation": "Bạn đã có 1 ngày tốt. Hôm nay hãy tập trung vào cảm giác 'tiến bộ' — nó sẽ nuôi dưỡng động lực tự nhiên.",
            "tasks": [
                ("Học bài 2 + làm quiz", "Sau cà phê sáng, tôi sẽ ngồi học bài 2 trong 1 tiếng.", 60, "medium", True),
                ("Ghi chú 5 điều mới học được", "Sau khi học xong, tôi sẽ viết 5 điều mới học.", 10, "easy", True),
            ],
            "evening_input": "Học xong bài 2. Quiz đúng 4/5. Ghi chú đầy đủ. Thấy mình thông minh hơn mình tưởng.",
            "evening_summary": "Liên tục 2 ngày hành động — tiến bộ rõ ràng. Quiz 4/5 là kết quả tốt!",
            "tomorrow_q": "Bạn muốn học tiếp hay thử làm 1 mini project nhỏ?",
        },
        {
            "input": "Vẫn oke. Nhưng bắt đầu thấy khó hơn. Bài 3 nhiều math.",
            "mood": "stable", "energy": 6,
            "pattern": "Difficulty spike — content getting harder, initial excitement fading",
            "framework": "two_minute_rule",
            "explanation": "Nội dung khó hơn là bình thường — bạn đang học thật sự. Khi cảm thấy ngại, hãy chỉ bắt đầu 2 phút trước. Thường thì bắt đầu rồi sẽ tiếp tục.",
            "tasks": [
                ("Mở bài 3, đọc 2 phút đầu tiên", "Sau cà phê, tôi sẽ mở bài 3 và đọc 2 phút đầu. Chỉ 2 phút.", 2, "very_easy", True),
                ("Học thêm 30 phút sau khi bắt đầu", "Nếu đã bắt đầu, tôi sẽ học thêm 30 phút nữa.", 30, "medium", True),
            ],
            "evening_input": "Bắt đầu khó. Đọc 2 phút rồi tiếp được thêm 20 phút. Chưa xong bài 3 nhưng đã hiểu 60%.",
            "evening_summary": "Dùng two-minute-rule thành công — bắt đầu được dù khó. Chưa xong bài 3 nhưng 60% cũng là tiến bộ.",
            "tomorrow_q": "Bạn thấy phần nào của bài 3 khó nhất?",
        },
        {
            "input": "Hôm nay hơi mệt. Hôm qua ngủ muộn vì cuốn theo YouTube. Bài 3 còn 40% chưa hiểu.",
            "mood": "anxious", "energy": 4,
            "pattern": "Energy dip from poor sleep — vulnerability window for procrastination",
            "framework": "self_compassion",
            "explanation": "Mệt vì ngủ muộn, không phải vì bạn lười. Nhận biết nguyên nhân giúp bạn không tự trách. Hôm nay làm ít thôi, và đi ngủ đúng giờ tối nay.",
            "tasks": [
                ("Xem video giải thích lại phần khó của bài 3", "Tôi sẽ tìm 1 video YouTube giải thích lại phần đó trong 15 phút.", 15, "easy", False),
            ],
            "evening_input": "Không học được. Cuốn theo TikTok cả chiều. Thấy tội lỗi.",
            "evening_summary": "Ngày không học được — nhưng nguyên nhân là ngủ muộn + mệt, không phải lười. Ngày mai reset với giấc ngủ tốt hơn.",
            "tomorrow_q": "Tối nay bạn có đặt báo thức cho việc đi ngủ không?",
        },
        {
            "input": "Oke ngày mới. Hôm qua ngủ sớm hơn. Sẽ cố gắng bù lại.",
            "mood": "stable", "energy": 5,
            "pattern": "Recovery attempt — trying to make up for lost day",
            "framework": "progress_principle",
            "explanation": "Không cần 'bù lại' — chỉ cần làm việc hôm nay. Mỗi ngày là độc lập. Bạn đã ngủ sớm hơn — đó đã là tiến bộ.",
            "tasks": [
                ("Hoàn thành nốt bài 3", "Sau cà phê, tôi sẽ học 45 phút để xong bài 3.", 45, "medium", True),
                ("Gửi 1 tin nhắn hỏi thăm 1 người trong ngành AI", "Trước 5h chiều, tôi sẽ gửi 1 tin nhắn trên LinkedIn cho người làm AI.", 15, "easy", False),
            ],
            "evening_input": "Xong bài 3! Nhưng chưa gửi tin nhắn. Ngại quá, không biết nói gì.",
            "evening_summary": "Hoàn thành bài 3 — tốt! Chưa gửi tin nhắn networking — đây là việc khó về cảm xúc, không phải về thời gian.",
            "tomorrow_q": "Bạn ngại gì nhất khi gửi tin nhắn cho người lạ?",
        },
        {
            "input": "Cuối tuần. Thấy chill hơn. Nhưng cũng bắt đầu tự hỏi: mình có đang đi đúng hướng không? AI hay BA?",
            "mood": "anxious", "energy": 5,
            "pattern": "Analysis paralysis — questioning the path instead of walking it",
            "framework": "80_20_pareto",
            "explanation": "Bạn đang 'analysis paralysis' — hỏi nhiều quá thay vì làm. 80% giá trị đến từ 20% hành động. Bây giờ chưa cần chọn AI hay BA — hãy làm cả hai ít một rồi sẽ rõ.",
            "tasks": [
                ("Dành 20 phút đọc 1 bài viết về 'ngày làm việc của BA'", "Sáng nay tôi sẽ đọc 1 bài trên Medium về BA là gì.", 20, "easy", True),
                ("Viết ra: AI thích điểm gì, BA thích điểm gì", "Sau khi đọc, tôi sẽ viết 2 cột so sánh.", 15, "easy", True),
            ],
            "evening_input": "Đọc xong. BA có vẻ phù hợp tính mình hơn — giao tiếp nhiều, không cần code quá sâu. Nhưng AI lương cao hơn. Vẫn phân vân.",
            "evening_summary": "Đã bắt đầu phân tích — tốt! Nhưng cần tránh vòng lặp suy nghĩ. Quyết định lúc này không cần hoàn hảo, chỉ cần đủ tốt để bắt đầu.",
            "tomorrow_q": "Nếu bạn chỉ có 1 tháng để thử, bạn sẽ chọn AI hay BA trước?",
        },
        {
            "input": "Chủ nhật. Nghỉ ngơi. Nhưng trong đầu vẫn loạn. AI? BA? Hay đi chạy Grab tạm?",
            "mood": "anxious", "energy": 4,
            "pattern": "Sunday scaries + decision fatigue — escape fantasy (Grab) emerging",
            "framework": "self_compassion",
            "explanation": "Ý định 'đi chạy Grab tạm' là nốt an toàn tâm lý — bạn muốn hành động gì đó ngay để giảm lo lắng. Đó không sai. Nhưng hãy nhận ra: nó là phản ứng với lo lắng, không phải giải pháp thực sự.",
            "tasks": [
                ("Nghỉ ngơi thật sự — không đọc, không học, không suy nghĩ về career", "Hôm nay tôi sẽ làm 1 việc chỉ để vui: xem phim, đi dạo, nấu ăn. Không liên quan career.", 60, "easy", True),
            ],
            "evening_input": "Đi dạo được 1 tiếng. Thấy nhẹ hơn. Nhưng vẫn lo. Tuần mới lại bắt đầu vòng lặp.",
            "evening_summary": "Nghỉ ngơi là cần thiết. Bạn nhận ra 'vòng lặp' — đó là tự nhận thức quan trọng. Tuần tới hãy thử 1 cách khác.",
            "tomorrow_q": "Tuần tới bạn muốn thử gì khác so với tuần này?",
        },
    ]

    for i, wd in enumerate(week1_data):
        tasks = []
        for t in wd["tasks"]:
            tasks.append({
                "title": t[0],
                "implementation": t[1],
                "estimated_minutes": t[2],
                "difficulty": t[3],
                "completed": t[4],
                "created_at": make_dt(d[i], 8, 0),
            })
        entry = {
            "morning": {
                "user_input": wd["input"],
                "mood_state": wd["mood"],
                "energy_level": wd["energy"],
                "pattern": wd["pattern"],
                "framework": wd["framework"],
                "explanation": wd["explanation"],
                "tasks": tasks,
            },
            "streak_day": i + 1,
        }
        if "evening_input" in wd:
            entry["evening"] = {
                "user_input": wd["evening_input"],
                "summary": wd["evening_summary"],
                "pattern_detected": i >= 3,
                "tomorrow_question": wd["tomorrow_q"],
            }
        history[make_iso(d[i])] = entry

    # ─── TUẦN 2: BẮT ĐẦU TRƯỢT ───────────────────────────────────────────

    week2_data = [
        ("Tuần mới. Sẽ làm CV hôm nay.", "stable", 5, "implementation_intention",
         "Làm CV cụ thể: chọn template, điền thông tin, gửi cho 1 người review.",
         [("Chọn 1 template CV trên Canva", "Sau cà phê sáng tôi sẽ vào Canva chọn template.", 20, "easy", True),
          ("Điền thông tin cơ bản vào CV", "Sau trưa tôi sẽ điền vào template đã chọn.", 40, "medium", False)],
         "Chọn được template. Nhưng chưa điền — đi chơi với bạn buổi chiều. Thật ra cũng ngại viết về bản thân.",
         "Bạn ngại điểm nào nhất khi viết về bản thân trong CV?"),

        ("Phải xong CV. Không thể trì hoãn nữa.", "anxious", 5, "two_minute_rule",
         "Đừng nghĩ về 'xong CV'. Chỉ cần mở file ra và viết 2 dòng đầu tiên. 2 phút.",
         [("Mở file CV và viết 2 dòng đầu: Tên + Mục tiêu", "Mở Canva, gõ tên và 1 câu mục tiêu ngắn.", 5, "very_easy", True),
          ("Viết thêm 3 skill vào CV", "Sau 2 dòng đầu, viết thêm 3 kỹ năng.", 15, "easy", True)],
         "Viết được! CV có 5 dòng rồi. Chưa đẹp nhưng có rồi. Thấy nhẹ.",
         "Ngày mai bạn muốn chỉnh sửa thêm hay gửi cho ai đó xem trước?"),

        ("Hôm nay không muốn làm gì. Ngủ đến 11h. Đọc tin nhắn thấy bạn bè đi làm hết rồi.", "overwhelmed", 3, "behavioral_activation",
         "So sánh với bạn bè đang làm bạn cảm thấy tệ hơn. Nhưng hành trình của mỗi người khác nhau. Hôm nay hãy làm 1 việc nhỏ để quay lại quỹ đạo.",
         [("Ra khỏi nhà 15 phút — đi mua cà phê hoặc đi dạo", "Trước 2h chiều, tôi sẽ đi ra ngoài 15 phút.", 15, "very_easy", False)],
         None, None),

        ("Skip hôm qua. Hôm nay cũng không muốn. Bao nhiêu lần bắt đầu rồi bỏ rồi?", "numb", 2, "self_compassion",
         "Bạn đang đếm số lần 'thất bại'. Nhưng mỗi lần bạn quay lại là 1 lần bạn chọn không bỏ cuộc. Đó không phải yếu — đó là kiên trì.",
         [("Viết 1 câu cho chính mình: 'Mình vẫn đang cố'", "Lấy giấy, viết 1 câu. Chỉ 1 câu.", 3, "very_easy", True)],
         "Viết được: 'Mình sẽ không bỏ cuộc lần nữa'. Nhưng nói thật là cũng không biết có giữ được không.",
         "Câu nào bạn viết hôm nay mà bạn muốn mình nhớ?"),

        ("Bắt đầu nghĩ nghiêm túc về đi chạy Grab. Ít nhất có tiền.", "numb", 3, "behavioral_activation",
         "Grab là lựa chọn hợp lý về tài chính. Nhưng nó không loại trừ việc học. Bạn có thể chạy Grab ban ngày và học 1 tiếng tối. Không phải chọn 1.",
         [("Tìm hiểu điều kiện đăng ký chạy Grab", "Tôi sẽ search Google và đọc 1 bài hướng dẫn đăng ký.", 20, "easy", True),
          ("Đồng thời: học 1 bài ML ngắn 20 phút", "Tối nay trước khi ngủ, tôi sẽ học 1 video ngắn về ML.", 20, "easy", False)],
         "Đọc về Grab xong. Cần xe và giấy phép. Chưa có. Lại bế tắc. Không học được ML — ngồi lướt mạng cả tối.",
         "Bạn cảm thấy thế nào khi cả 2 hướng đều có trở ngại?"),

        ("Không làm gì cả. Nằm nhà cả ngày. Ăn mì gói.", "numb", 1, "two_minute_rule",
         "Không sao. Hôm nay nằm nhà là đủ. Không phải mỗi ngày đều phải 'productive'. Nhưng nếu bạn muốn, chỉ cần 1 việc 2 phút.",
         [("Rửa mặt — chỉ rửa mặt thôi", "Khi đọc được dòng này, tôi sẽ đứng dậy và rửa mặt.", 2, "very_easy", True)],
         None, None),

        ("Chủ nhật. Mẹ hỏi 'con tìm việc chưa'. Không biết trả lời sao.", "overwhelmed", 2, "self_compassion",
         "Câu hỏi của mẹ không phải để trách — nhưng nó chạm vào nỗi đau. Bạn đang cố gắng, chỉ là kết quả chưa đến. Hãy tự cho phép mình 'chưa biết' — đó không phải 'thất bại'.",
         [("Nói với mẹ 1 câu trung thực: 'Con đang tìm, chưa có kết quả'", "Hôm nay khi mẹ hỏi, tôi sẽ nói trung thực thay vì tránh.", 5, "easy", True)],
         "Nói với mẹ rồi. Mẹ nói 'từ từ, không ai ép'. Thấy nhẹ hơn một chút. Nhưng vẫn buồn.",
         "Cảm giác khi mẹ nói 'từ từ' có giúp bạn bớt áp lực không?"),
    ]

    for i, wd2 in enumerate(week2_data):
        idx = 7 + i
        inp, mood, energy, fw, expl, task_list, ev_input, ev_q = wd2
        tasks = []
        for t in task_list:
            tasks.append({
                "title": t[0], "implementation": t[1],
                "estimated_minutes": t[2], "difficulty": t[3],
                "completed": t[4], "created_at": make_dt(d[idx], 8, 0),
            })
        entry = {
            "morning": {
                "user_input": inp, "mood_state": mood, "energy_level": energy,
                "pattern": f"Week 2 pattern — {fw}", "framework": fw,
                "explanation": expl, "tasks": tasks,
            },
            "streak_day": idx + 1,
        }
        if ev_input:
            entry["evening"] = {
                "user_input": ev_input,
                "summary": f"Ngày {idx+1}: " + (ev_input[:80] if ev_input else ""),
                "pattern_detected": mood in ("numb", "overwhelmed"),
                "tomorrow_question": ev_q or "",
            }
        history[make_iso(d[idx])] = entry

    # ─── TUẦN 3: TRÌ HOÃN TOÀN PHẦN + TỰ TRÁCH ──────────────────────────

    week3_moods = [
        ("Lại một tuần mới. Tuần trước không làm được gì. Tự hứa sẽ khác.", "anxious", 4, "implementation_intention",
         [("Quay lại CV: thêm phần kinh nghiệm/project", 30, "easy", False)],
         "Không làm được. Ngồi xem YouTube cả ngày. Tự hứa vòng lặp lại bắt đầu."),
        ("Hôm qua lại break. Mình có vấn đề gì vậy?", "overwhelmed", 2, "self_compassion",
         [("Đọc lại những gì mình đã viết những ngày trước", 10, "very_easy", True)],
         "Đọc lại. Thấy mình cũng có những ngày tốt. Nhưng sao không giữ được?"),
        ("Mình lười. Ai cũng làm được ngoại trừ mình.", "overwhelmed", 2, "self_compassion",
         [("Viết: 1 điều mình làm được hôm nay dù nhỏ", 5, "very_easy", False)],
         None),
        ("Lại trì hoãn. Không mở được máy tính. Chỉ muốn ngủ.", "numb", 1, "two_minute_rule",
         [("Mở máy tính lên — chỉ mở thôi, không cần làm gì", 2, "very_easy", False)],
         None),
        ("5 ngày không làm gì rồi. Chắc mình không hợp với ngành này.", "numb", 1, "behavioral_activation",
         [("Đi ra ngoài 10 phút. Hít thở.", 10, "very_easy", True)],
         "Đi ra ngoài. Trời đẹp. Nhưng trong lòng vẫn nặng. Mình thật sự không biết mình đang làm gì."),
        ("Nghĩ đến việc bỏ hết, đi làm phụ công nhân.", "numb", 2, "self_compassion",
         [("Gọi điện cho 1 người bạn thân — nói chuyện 10 phút", 10, "very_easy", True)],
         "Gọi cho Tuấn. Nó nói nó cũng từng bị như vậy. Thấy bớt cô đơn."),
        ("Chủ nhật. 3 tuần rồi. Không tiến bộ gì.", "overwhelmed", 2, "progress_principle",
         [("Nhìn lại 21 ngày: đếm số ngày có làm ít nhất 1 việc", 10, "easy", True)],
         "Đếm lại: 12/21 ngày có làm ít nhất 1 việc. Không nhiều, nhưng không phải zero. Có lẽ mình khắc quá với mình."),
    ]

    for i, w3 in enumerate(week3_moods):
        idx = 14 + i
        inp, mood, energy, fw, task_list, ev_input = w3
        tasks = []
        for t in task_list:
            tasks.append({
                "title": t[0], "implementation": f"Tôi sẽ {t[0].lower()} trong {t[1]} phút.",
                "estimated_minutes": t[1], "difficulty": t[2],
                "completed": t[3], "created_at": make_dt(d[idx], 9, 0),
            })
        entry = {
            "morning": {
                "user_input": inp, "mood_state": mood, "energy_level": energy,
                "pattern": f"Tuần 3 — vòng lặp trì hoãn sâu, {fw}",
                "framework": fw, "explanation": f"Bạn đang trong giai đoạn khó khăn. {fw.replace('_', ' ').title()} sẽ giúp bạn quay lại từ từ.",
                "tasks": tasks,
            },
            "streak_day": idx + 1,
        }
        if mood in ("numb", "overwhelmed") and idx >= 16:
            entry["morning"]["pattern_alert"] = {
                "pattern_name": "learned_helplessness" if mood == "numb" else "shame_spiral",
                "severity": "high" if idx >= 17 else "medium",
                "recommended_override": "self_compassion",
                "consecutive_days": idx - 14,
                "details": f"{idx - 14} ngày liên tục energy thấp + mood {mood}",
            }
        if ev_input:
            entry["evening"] = {
                "user_input": ev_input,
                "summary": ev_input[:100],
                "pattern_detected": True,
                "tomorrow_question": "Ngày mai bạn muốn thử 1 điều gì khác hoàn toàn so với tuần này?",
            }
        history[make_iso(d[idx])] = entry

    # ─── TUẦN 4: THỬ LẠI ──────────────────────────────────────────────────

    week4_data = [
        ("Tuần mới. Lần này sẽ khác. Sẽ bắt đầu bằng việc nhỏ nhất.", "stable", 4, "two_minute_rule",
         [("Đăng ký 1 tài khoản LinkedIn (nếu chưa có)", 15, "easy", True),
          ("Viết 1 dòng giới thiệu ngắn trên LinkedIn", 10, "easy", True)],
         "Làm được! Có LinkedIn rồi. Viết: 'Fresh graduate interested in AI/BA'. Đơn giản nhưng có rồi."),
        ("Hôm qua làm được. Nay tiếp.", "stable", 5, "habit_stacking",
         [("Hoàn thành CV — thêm project + skill", 40, "medium", True),
          ("Gửi CV cho 1 người review", 10, "easy", False)],
         "CV xong 80%. Chưa gửi review — ngại. Nhưng bản thân CV đẹp hơn nhiều."),
        ("CV gần xong. Nhưng bắt đầu nghĩ: mình đủ giỏi chưa?", "anxious", 4, "dunning_kruger",
         [("Hoàn thành 20% cuối của CV", 20, "easy", True),
          ("Gửi CV cho Tuấn xem", 5, "very_easy", True)],
         "Gửi cho Tuấn. Nó nói 'oke đấy, gửi đi'. Thấy tốt hơn."),
        ("Sẽ gửi CV cho 3 công ty hôm nay.", "stable", 6, "implementation_intention",
         [("Tìm 3 job post AI Intern/BA Intern trên LinkedIn", 20, "easy", True),
          ("Gửi CV cho công ty 1", 10, "easy", True),
          ("Gửi CV cho công ty 2 + 3", 15, "easy", False)],
         "Gửi được 1 công ty. 2 công ty kia yêu cầu kinh nghiệm. Hơi thất vọng nhưng đã gửi 1 rồi."),
        ("Hôm qua gửi được 1 CV. Chưa ai trả lời. Bình thường.", "stable", 5, "progress_principle",
         [("Gửi thêm 2 CV nữa", 20, "easy", True),
          ("Học 1 bài interview prep", 30, "medium", False)],
         "Gửi 2 CV. Tổng 3 rồi. Chưa học interview. Mệt."),
        ("5 ngày làm việc. Mệt. Nghỉ.", "numb", 3, "self_compassion",
         [("Nghỉ ngơi — làm gì vui thôi", 60, "easy", True)],
         "Chơi game cả ngày. Nghỉ ngơi thật sự. Nhưng tối lại lo."),
        ("Chủ nhật. 1 tháng rồi. Gửi 3 CV, chưa ai trả lời. Đã học được 3 bài ML. Có LinkedIn. Nhưng vẫn chưa có gì chắc chắn.", "anxious", 4, "progress_principle",
         [("Viết ra tất cả những gì đã làm trong 30 ngày", 15, "easy", True)],
         "Danh sách: CV xong, LinkedIn xong, 3 bài ML, gửi 3 CV, đọc về BA, gọi điện cho bạn. Không ít. Nhưng cũng không nhiều. Vẫn phân vân AI hay BA. Vẫn chưa có thu nhập."),
    ]

    for i, w4 in enumerate(week4_data):
        idx = 21 + i
        inp, mood, energy, fw, task_list, ev_input = w4
        tasks = []
        for t in task_list:
            tasks.append({
                "title": t[0],
                "implementation": f"Tôi sẽ {t[0].lower()}.",
                "estimated_minutes": t[1],
                "difficulty": t[2],
                "completed": t[3],
                "created_at": make_dt(d[idx], 8, 30),
            })
        entry = {
            "morning": {
                "user_input": inp, "mood_state": mood, "energy_level": energy,
                "pattern": f"Tuần 4 — thử lại, {fw}",
                "framework": fw, "explanation": "Bạn đang thử lại. Lần này hãy tập trung vào tiến bộ nhỏ thay vì kết quả lớn.",
                "tasks": tasks,
            },
            "streak_day": idx + 1,
        }
        if ev_input:
            entry["evening"] = {
                "user_input": ev_input,
                "summary": ev_input[:100],
                "pattern_detected": mood in ("numb", "anxious"),
                "tomorrow_question": "Bạn thấy điều gì đã tốt hơn so với tuần 2-3?",
            }
        history[make_iso(d[idx])] = entry

    # ─── 2 NGÀY CUỐI: LẠI BẾ TẮC ───────────────────────────────────────

    # Ngày 29
    history[make_iso(d[28])] = {
        "morning": {
            "user_input": "1 tháng rồi. Vẫn chưa có việc. Vẫn loay hoay giữa AI và BA. Bắt đầu mệt với bản thân mình.",
            "mood_state": "overwhelmed",
            "energy_level": 3,
            "pattern": "Month-end review triggering despair — the loop becomes visible",
            "framework": "self_compassion",
            "explanation": "Bạn đang nhìn lại 1 tháng và thấy 'vòng lặp'. Đó đau — nhưng việc bạn nhận ra nó là bước đầu để thoát ra. Không ai thay đổi trong 30 ngày. Hãy nhẹ nhàng với mình.",
            "tasks": [
                {
                    "title": "Viết thư cho mình-của-ngày-1: 'Mình đã học được gì trong 30 ngày?'",
                    "implementation": "Tôi sẽ ngồi 10 phút và viết 1 lá thư ngắn cho chính mình ngày đầu tiên.",
                    "estimated_minutes": 10,
                    "difficulty": "easy",
                    "completed": True,
                    "created_at": make_dt(d[28], 9, 0),
                },
            ],
            "pattern_alert": {
                "pattern_name": "shame_spiral",
                "severity": "medium",
                "recommended_override": "self_compassion",
                "consecutive_days": 2,
                "details": "Tự đánh giá tiêu cực + so sánh + kết luận 'thất bại' sau 1 tháng",
            },
        },
        "evening": {
            "user_input": "Viết thư cho mình. Đọc lại thấy khóc. Mình đã cố gắng nhiều hơn mình tưởng. Nhưng kết quả chưa đến. Mình không biết tiếp tục thế nào.",
            "summary": "Ngày cảm xúc mạnh — viết thư cho bản thân, nhận ra cố gắng nhưng vẫn đau vì kết quả chưa đến. Đây là ngày quan trọng để tự nhận thức.",
            "pattern_detected": True,
            "tomorrow_question": "Nếu bạn có thể nói 1 câu với mình của 30 ngày trước, bạn sẽ nói gì?",
        },
        "streak_day": 29,
    }

    # Ngày 30
    history[make_iso(d[29])] = {
        "morning": {
            "user_input": "Ngày cuối tháng. Vẫn ở đây. Vẫn chưa biết chọn AI hay BA. Vẫn chưa có việc. Nhưng vẫn mở app này mỗi sáng. Có lẽ đó cũng là gì đó.",
            "mood_state": "anxious",
            "energy_level": 3,
            "pattern": "Quiet persistence — still showing up despite feeling stuck",
            "framework": "progress_principle",
            "explanation": "Bạn nói 'vẫn mở app này mỗi sáng' — đó không phải 'gì đó', đó là kiên trì. Trong 30 ngày, bạn đã không bỏ cuộc hoàn toàn dù rất muốn. Hãy nhìn vào điều đó.",
            "tasks": [
                {
                    "title": "Viết 1 danh sách: 5 việc mình đã làm được trong 30 ngày",
                    "implementation": "Ngồi với cà phê, viết ra 5 điều cụ thể đã làm được.",
                    "estimated_minutes": 10,
                    "difficulty": "very_easy",
                    "completed": False,
                    "created_at": make_dt(d[29], 9, 0),
                },
            ],
        },
        "streak_day": 30,
    }

    return profile, history


# ============================================================================
# Main
# ============================================================================

def seed_auth_account(account_num: int) -> None:
    """Insert or update an auth account in aura.db."""
    from core.database import get_connection, init_db
    from core.auth import hash_password

    init_db()
    creds = SEED_ACCOUNTS[account_num]
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM accounts WHERE email = ?", (creds["email"],)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE accounts SET password_hash = ?, name = ? WHERE email = ?",
                (hash_password(creds["password"]), creds["name"], creds["email"]),
            )
            account_id = existing["id"]
            print(f"  -> Auth account updated: {creds['email']}")
        else:
            cursor = conn.execute(
                "INSERT INTO accounts (email, password_hash, name) VALUES (?, ?, ?)",
                (creds["email"], hash_password(creds["password"]), creds["name"]),
            )
            account_id = cursor.lastrowid
            print(f"  -> Auth account created: {creds['email']}")

        # Ensure linked user row exists
        user_id = f"user_{account_id}"
        conn.execute(
            "INSERT OR IGNORE INTO users (id, account_id, name) VALUES (?, ?, ?)",
            (user_id, account_id, creds["name"]),
        )
        conn.commit()
    finally:
        conn.close()


def seed(account: str) -> None:
    if account in ("1", "all"):
        print("\n[Account 1] Hành trình giảm cân — 10 ngày")
        p1, h1 = build_account_1()
        write_json(DATA_DIR / "account1_profile.json", p1)
        write_json(DATA_DIR / "account1_history.json", h1)
        seed_auth_account(1)
        if account == "1":
            write_json(PROFILE_PATH, p1)
            write_json(HISTORY_PATH, h1)
            print("  >> Active: Account 1 loaded into profile.json + history.json")

    if account in ("2", "all"):
        print("\n[Account 2] Tìm định hướng công việc — 30 ngày")
        p2, h2 = build_account_2()
        write_json(DATA_DIR / "account2_profile.json", p2)
        write_json(DATA_DIR / "account2_history.json", h2)
        seed_auth_account(2)
        if account in ("2", "all"):
            write_json(PROFILE_PATH, p2)
            write_json(HISTORY_PATH, h2)
            print("  >> Active: Account 2 loaded into profile.json + history.json")

    print("\nĐã tạo xong tài khoản thử nghiệm!")
    print("\n  Credentials:")
    if account in ("1", "all"):
        c1 = SEED_ACCOUNTS[1]
        print(f"    Account 1: {c1['email']} / {c1['password']}")
    if account in ("2", "all"):
        c2 = SEED_ACCOUNTS[2]
        print(f"    Account 2: {c2['email']} / {c2['password']}")
    print("\nSwitch account:")
    print("  python scripts/seed_accounts.py 1   # Giảm cân")
    print("  python scripts/seed_accounts.py 2   # Định hướng")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg not in ("1", "2", "all"):
        print("Usage: python scripts/seed_accounts.py [1|2|all]")
        sys.exit(1)
    seed(arg)
