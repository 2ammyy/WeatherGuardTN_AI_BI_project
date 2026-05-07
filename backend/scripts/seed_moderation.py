"""
Seed moderation test data — creates sample reports with varied priorities and statuses.
Run: docker exec -it climate-backend python /app/scripts/seed_moderation.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from sqlalchemy import text
from app.database import SessionLocal
from app.forum.models import PostReport, CommentReport, UserReport
from app.admin.priority import classify_priority

TEST_REASONS = [
    # High priority reasons
    ("This user posted my private address and phone number without consent", "high"),
    ("Contains hate speech targeting a specific ethnic group", "high"),
    ("Threatening violence against other community members", "high"),
    ("This post encourages self-harm and dangerous behavior", "high"),
    ("Sexual harassment in the comments section", "high"),
    ("Immediate danger - someone is planning to cause harm", "high"),
    ("Fraudulent post asking for money under false pretenses", "high"),

    # Medium priority reasons
    ("Misleading information about the upcoming weather storm", "medium"),
    ("The user is spreading false rumors, please review", "medium"),
    ("Suspicious account activity, possible bot behavior", "medium"),
    ("This article is biased and contains unverified claims", "medium"),
    ("Duplicate post already exists on the same topic", "medium"),
    ("User is being disrespectful but not threatening", "medium"),
    ("Copyright issue - my photo was used without permission", "medium"),

    # Low priority reasons
    ("Minor typo in the post, just a heads up", "low"),
    ("Just some formatting issues, nothing serious", "low"),
    ("Spam advertisement for a weather product", "low"),
    ("Low quality content, not very informative", "low"),
    ("User posted in the wrong language category", "low"),
    ("Small grammatical errors throughout the post", "low"),
    ("This seems like a repost from last month", "low"),
]

def seed():
    db = SessionLocal()
    users = db.execute(text("SELECT id FROM forum_users ORDER BY created_at LIMIT 10")).fetchall()
    posts = db.execute(text("SELECT id FROM forum_posts ORDER BY created_at LIMIT 10")).fetchall()
    comments = db.execute(text("SELECT id FROM forum_comments ORDER BY created_at LIMIT 10")).fetchall()

    if not users:
        print("No users found. Create forum users first.")
        return
    if not posts:
        print("No posts found. Create forum posts first.")
        return
    if not comments:
        print("No comments found. Create forum comments first.")
        return

    print(f"Found {len(users)} users, {len(posts)} posts, {len(comments)} comments")

    # Clear existing reports
    for m in [PostReport, CommentReport, UserReport]:
        db.query(m).delete()
    db.commit()
    print("Cleared existing reports")

    count = 0
    prio_stats = {"high": 0, "medium": 0, "low": 0}
    statuses = ["pending", "reviewed", "dismissed"]

    for i, (reason, expected_priority) in enumerate(TEST_REASONS):
        # Assign user in round-robin, ensure reporter != reported for user_reports
        reporter = users[i % len(users)][0]
        target_user = users[(i + 3) % len(users)][0]
        if target_user == reporter:
            target_user = users[(i + 5) % len(users)][0]
        post = posts[i % len(posts)][0]
        comment = comments[i % len(comments)][0]

        # Run AI priority
        ai_result = classify_priority(reason)
        status = statuses[i % 3]

        # Create PostReport
        pr = PostReport(
            post_id=post, reporter_id=reporter, reason=reason,
            status=status, priority=ai_result["priority"],
            priority_score=ai_result["score"],
        )
        db.add(pr)

        # Create CommentReport
        cr = CommentReport(
            comment_id=comment, reporter_id=reporter, reason=reason,
            status=status, priority=ai_result["priority"],
            priority_score=ai_result["score"],
        )
        db.add(cr)

        # Create UserReport
        ur = UserReport(
            reporter_id=reporter, reported_id=target_user, reason=reason,
            status=status, priority=ai_result["priority"],
            priority_score=ai_result["score"],
        )
        db.add(ur)

        prio_stats[ai_result["priority"]] = prio_stats.get(ai_result["priority"], 0) + 3
        count += 3

    db.commit()
    print(f"\nSeeded {count} reports ({count//3} of each type):")
    for p, c in sorted(prio_stats.items()):
        print(f"  {p.upper():8s}: {c:3d}")
    print(f"\nStatus distribution: pending=7, reviewed=7, dismissed=7")
    print("\nDone! Login at /admin to see reports with AI priorities.")

if __name__ == "__main__":
    seed()
