"""
╔══════════════════════════════════════════════════════════════╗
║  WeatherGuardTN — AI Moderation Test Suite                  ║
║                                                              ║
║  Tests the priority classifier with detailed output,        ║
║  accuracy metrics, confusion matrix, and edge cases.        ║
║                                                              ║
║  Usage:                                                      ║
║    python scripts/test_ai_moderation.py                      ║
║    python scripts/test_ai_moderation.py --verbose            ║
║    python scripts/test_ai_moderation.py --interactive        ║
║    python scripts/test_ai_moderation.py --text "your text"   ║
╚══════════════════════════════════════════════════════════════╝
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import argparse
from app.admin.priority import (
    classify_priority,
    evaluate_model,
    test_custom_text,
    SEED_DATA,
    _LABELS,
    _build_pipeline,
    _get_pipeline,
)

# ── ANSI colors ──
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
PURPLE = "\033[95m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

BAR = "▰"
EMPTY = "▱"


def print_banner():
    print(f"""
{BOLD}{GREEN}╔══════════════════════════════════════════════════════════╗{RESET}
{BOLD}{GREEN}║  {CYAN}WeatherGuardTN — AI Moderation Test Suite{RESET}{GREEN}            ║{RESET}
{BOLD}{GREEN}╚══════════════════════════════════════════════════════════╝{RESET}
""")


def print_header(title):
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}\n")


def print_result(text, result, expected=None):
    prio = result["priority"]
    color = {"high": RED, "medium": YELLOW, "low": DIM}.get(prio, RESET)
    icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}.get(prio, "⚪")
    bar_len = 20
    filled = int(result["score"] / 100 * bar_len)
    bar_str = f"{GREEN if prio == 'low' else color}{BAR * filled}{DIM}{EMPTY * (bar_len - filled)}{RESET}"
    expected_str = f"  [{GREEN if expected == prio else RED}expected: {expected or '?'}{RESET}]" if expected else ""

    print(f"  {icon} {color}{BOLD}{prio.upper():8s}{RESET}  {bar_str}  {BOLD}{result['score']:3d}%{RESET}{expected_str}")
    print(f"     {DIM}{text[:100]}{'…' if len(text) > 100 else ''}{RESET}")
    if result.get("probabilities"):
        probs = result["probabilities"]
        print(f"     {DIM}probs:{RESET} ", end="")
        for cls in _LABELS:
            p = probs.get(cls, 0)
            c = {"high": RED, "medium": YELLOW, "low": DIM}.get(cls, RESET)
            print(f"{c}{cls}={p*100:.1f}%{RESET} ", end="")
        print()
    if result.get("method"):
        method_tag = f"{CYAN}ML{RESET}" if result["method"] == "ml" else f"{YELLOW}Rules{RESET}"
        print(f"     {DIM}method: {method_tag}{RESET}")
    if result.get("top_features") and result["top_features"]:
        feats = ", ".join([f"{DIM}{f['feature']}{RESET}({f['weight']:+.3f})" for f in result["top_features"][:3]])
        print(f"     {DIM}features: {feats}{RESET}")
    print()


def run_self_test():
    """Test model on its own training data."""
    print_header("Self-Test: Training Data Accuracy")
    pipe = _get_pipeline()
    if not pipe:
        print(f"  {RED}Model not available!{RESET}\n")
        return

    texts = [t for t, _ in SEED_DATA]
    labels = [l for _, l in SEED_DATA]
    preds = pipe.predict(texts)

    correct = sum(1 for p, l in zip(preds, labels) if p == l)
    total = len(labels)
    accuracy = correct / total * 100

    print(f"  {BOLD}{total} training examples{RESET}")
    print(f"  {GREEN if accuracy > 85 else YELLOW}Accuracy: {accuracy:.1f}% ({correct}/{total}){RESET}\n")

    for cls in _LABELS:
        cls_indices = [i for i, l in enumerate(labels) if l == cls]
        cls_correct = sum(1 for i in cls_indices if preds[i] == cls)
        cls_total = len(cls_indices)
        cls_acc = cls_correct / cls_total * 100 if cls_total > 0 else 0
        color = {"high": RED, "medium": YELLOW, "low": DIM}.get(cls, RESET)
        icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}.get(cls, "⚪")
        print(f"  {icon} {color}{BOLD}{cls.upper():8s}{RESET}  {cls_acc:5.1f}%  ({cls_correct}/{cls_total})")

    # Show misclassifications
    errors = [(texts[i], labels[i], preds[i]) for i in range(total) if preds[i] != labels[i]]
    if errors:
        print(f"\n  {DIM}Misclassifications ({len(errors)}):{RESET}")
        for text, expected, got in errors[:5]:
            print(f"    {YELLOW}expected: {expected:7s} → got: {got:7s}{RESET}  {DIM}{text[:60]}{RESET}")
        if len(errors) > 5:
            print(f"    {DIM}… and {len(errors) - 5} more{RESET}")
    print()


def run_curated_tests():
    """Test on curated edge cases."""
    print_header("Curated Test Cases")

    test_cases = [
        # (text, expected_priority, description)
        ("⚠️ URGENT: Someone is being threatened with violence in this post", "high", "Urgent threat"),
        ("This user posted my home address and phone number", "high", "Doxing"),
        ("Hate speech targeting ethnic minorities in the comments", "high", "Hate speech"),
        ("Child safety concern - inappropriate content", "high", "Child safety"),
        ("Sexual harassment in direct messages", "high", "Harassment"),
        ("Fraudulent post asking for money", "high", "Fraud"),
        ("This person is planning to harm themselves, please help", "high", "Self-harm"),

        ("Misleading weather forecast for tomorrow's storm", "medium", "Misinfo"),
        ("User is spreading false rumors about flood damage", "medium", "False rumors"),
        ("Suspicious account activity, possible bot", "medium", "Bot suspicion"),
        ("Copyright violation - my photo used without credit", "medium", "Copyright"),
        ("Impersonation - someone pretending to be me", "medium", "Impersonation"),
        ("Duplicate post already exists on this topic", "medium", "Duplicate"),
        ("Post is in the wrong category", "medium", "Wrong category"),

        ("Minor spelling mistake in the article title", "low", "Typo"),
        ("Just some formatting issues, nothing serious", "low", "Formatting"),
        ("Simple spam advertisement for a weather app", "low", "Spam"),
        ("Low quality content, not very informative", "low", "Low quality"),
        ("Just a test post, nothing to worry about", "low", "Test post"),
        ("Small grammatical errors throughout the text", "low", "Grammar"),
        ("This seems like an old repost from last month", "low", "Repost"),
    ]

    correct = 0
    for text, expected, desc in test_cases:
        result = test_custom_text(text)
        is_correct = result["priority"] == expected
        if is_correct:
            correct += 1
        status = f"{GREEN}✓{RESET}" if is_correct else f"{RED}✗{RESET}"
        color = {"high": RED, "medium": YELLOW, "low": DIM}.get(result["priority"], RESET)
        print(f"  {status} {color}{result['priority'].upper():8s}{RESET} "
              f"({result['score']:3d}%)  {DIM}[{desc}]{RESET}")
        if not is_correct:
            print(f"       {DIM}text: {text[:80]}{RESET}")
            print(f"       {YELLOW}expected: {expected}{RESET}")

    total = len(test_cases)
    accuracy = correct / total * 100
    print(f"\n  {GREEN if accuracy >= 80 else YELLOW}Curated accuracy: {accuracy:.1f}% ({correct}/{total}){RESET}")
    print()


def run_edge_cases():
    """Test edge cases."""
    print_header("Edge Cases")

    edges = [
        ("", "Empty string"),
        ("   ", "Whitespace only"),
        ("a", "Single character"),
        ("This is fine, nothing to report", "Neutral text"),
        ("Lorem ipsum dolor sit amet consectetur adipiscing elit", "Gibberish"),
        ("😡😡😡😡😡", "Emoji only"),
        ("ME TOO PLEASE HELP NOW!!!", "All caps urgent"),
        ("THIS IS A JOKE HAHAHAHA", "All caps joking"),
        ("12345 67890 1112131415", "Numbers only"),
    ]

    for text, desc in edges:
        result = test_custom_text(text)
        method = result.get("method", "n/a")
        print(f"  [{DIM}{desc:25s}{RESET}] → {BOLD}{result['priority'].upper():8s}{RESET}  ({result['score']:3d}%)  "
              f"method: {CYAN if method == 'ml' else YELLOW if method == 'rule' else DIM}{method}{RESET}")
    print()


def run_bulk_test():
    """Test large batch of diverse cases."""
    print_header("Batch Test — 30 Diverse Cases")

    bulk_texts = [
        "Death threats and violent language in the forum post",
        "This user is harassing me daily with abusive messages",
        "My personal information was shared without my consent",
        "Contains hate speech targeting religious groups",
        "Emergency situation requiring immediate moderator attention",
        "User threatening to bomb a public building",
        "Child exploitation material in the uploaded images",
        "Fraudulent scheme asking users for credit card details",
        "Sexual content and harassment in the comments",
        "Someone is impersonating an admin and scamming users",

        "Misleading information about the weather conditions",
        "Spreading false rumors about government flood response",
        "User being rude but not explicitly threatening",
        "Copyright infringement - my image used without permission",
        "Suspicious account following pattern of bot behavior",
        "This post contains unverified claims about the storm",
        "Duplicate post already created by another user",
        "Biased article with questionable sources",
        "User changing their identity to impersonate someone",
        "Spam links posted repeatedly across multiple threads",

        "Minor typo in the weather report headline",
        "Just a small formatting issue with the table",
        "Low quality meme post that isn't helpful",
        "Simple advertisement for a weather product",
        "Just grammatical errors, nothing dangerous",
        "This post is in the wrong language category",
        "Old repost from last season's weather discussion",
        "Not a big deal but the image quality is poor",
        "Just a joke between friends, not serious",
        "Minor issue with the link, incorrect URL",
    ]

    results = []
    for text in bulk_texts:
        r = test_custom_text(text)
        results.append(r)

    dist = {"high": 0, "medium": 0, "low": 0}
    for r in results:
        dist[r["priority"]] += 1

    avg_conf = sum(r["score"] for r in results) / len(results)
    ml_count = sum(1 for r in results if r.get("method") == "ml")
    rule_count = sum(1 for r in results if r.get("method") == "rule")

    print(f"  {BOLD}Distribution:{RESET}")
    for cls in _LABELS:
        color = {"high": RED, "medium": YELLOW, "low": DIM}.get(cls, RESET)
        icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}.get(cls, "⚪")
        bar_len = 20
        filled = int(dist[cls] / max(dist.values()) * bar_len) if max(dist.values()) > 0 else 0
        bar_str = f"{color}{BAR * filled}{DIM}{EMPTY * (bar_len - filled)}{RESET}"
        print(f"  {icon} {color}{cls.upper():8s}{RESET}  {bar_str}  {dist[cls]:2d} ({dist[cls]/len(results)*100:4.1f}%)")

    print(f"  {DIM}────────────────────────────{RESET}")
    print(f"  {BOLD}Total:{RESET} {len(results)}  {BOLD}Avg Confidence:{RESET} {avg_conf:.1f}%  "
          f"{BOLD}ML:{RESET} {ml_count}  {BOLD}Rules:{RESET} {rule_count}")
    print()


def run_interactive():
    """Interactive mode — test user-provided text."""
    print_header("Interactive Mode")
    print(f"  {DIM}Type text to classify, or 'q' to quit.{RESET}\n")

    while True:
        try:
            text = input(f"  {BOLD}text>{RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not text or text.lower() == 'q':
            break

        result = test_custom_text(text)
        print_result(text, result)


def show_model_summary():
    """Show model summary and evaluation."""
    print_header("Model Summary")
    eval_data = evaluate_model()
    if "error" in eval_data:
        print(f"  {RED}{eval_data['error']}{RESET}\n")
        return

    print(f"  {BOLD}Model:{RESET}        {eval_data['model_type']}")
    print(f"  {BOLD}Classes:{RESET}      {', '.join(eval_data['classes'])}")
    print(f"  {BOLD}Seed Data:{RESET}    {eval_data['seed_examples']} examples")
    print(f"  {BOLD}Accuracy:{RESET}     {GREEN if eval_data['accuracy'] >= 0.85 else YELLOW}{eval_data['accuracy']*100:.1f}%{RESET} "
          f"({eval_data['correct']}/{eval_data['total']})")
    print(f"  {BOLD}Avg Conf:{RESET}     {eval_data['avg_confidence']*100:.1f}%\n")

    print(f"  {BOLD}Per-Class Performance:{RESET}")
    print(f"  {'Class':10s} {'Precision':10s} {'Recall':10s} {'F1-Score':10s} {'Support':10s}")
    print(f"  {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")
    for cls in _LABELS:
        m = eval_data["per_class"][cls]
        print(f"  {cls.upper():10s} {m['precision']:.4f}    {m['recall']:.4f}    {m['f1_score']:.4f}    {m['support']:4d}")

    print(f"\n  {BOLD}Example Confident Predictions:{RESET}")
    for cls in _LABELS:
        color = {"high": RED, "medium": YELLOW, "low": DIM}.get(cls, RESET)
        for ex in eval_data["example_predictions"].get(cls, []):
            print(f"  [{color}{cls.upper()}{RESET}] ({ex['confidence']*100:.0f}%) {DIM}{ex['text']}{RESET}")

    print()


def run_custom_text(text: str):
    """Run on a single custom text."""
    print_header(f"Testing: {text[:60]}{'…' if len(text) > 60 else ''}")
    result = test_custom_text(text)
    print_result(text, result)


def main():
    parser = argparse.ArgumentParser(
        description="WeatherGuardTN AI Moderation Test Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/test_ai_moderation.py              # Run full test suite
  python scripts/test_ai_moderation.py --verbose     # Verbose mode
  python scripts/test_ai_moderation.py --interactive # Interactive mode
  python scripts/test_ai_moderation.py --text "..."  # Test one string
  python scripts/test_ai_moderation.py --quick       # Quick summary only
        """
    )
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    parser.add_argument('--text', '-t', type=str, help='Test a single text string')
    parser.add_argument('--quick', '-q', action='store_true', help='Quick mode (summary only)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')

    args = parser.parse_args()

    print_banner()

    if args.text:
        run_custom_text(args.text)
        return

    if args.interactive:
        show_model_summary()
        run_interactive()
        return

    # Full suite
    show_model_summary()

    if not args.quick:
        run_self_test()
        run_curated_tests()
        run_edge_cases()
        run_bulk_test()

    # Final verdict
    eval_data = evaluate_model()
    if "error" not in eval_data:
        accuracy = eval_data["accuracy"] * 100
        print_header("Final Verdict")
        if accuracy >= 90:
            print(f"  {GREEN}{BOLD}✅ Excellent!{RESET} Model is performing well ({accuracy:.1f}% accuracy){RESET}")
        elif accuracy >= 80:
            print(f"  {YELLOW}{BOLD}⚡ Good{RESET} — Model accuracy is acceptable ({accuracy:.1f}%){RESET}")
            print(f"  {DIM}  Consider adding more diverse training examples for edge cases.{RESET}")
        else:
            print(f"  {RED}{BOLD}⚠ Needs Improvement{RESET} — Accuracy is only {accuracy:.1f}%{RESET}")
            print(f"  {DIM}  Add more training data, especially for under-represented patterns.{RESET}")
        print()


if __name__ == "__main__":
    main()
