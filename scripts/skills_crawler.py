#!/usr/bin/env python3
"""
skills.sh 爬虫 — 从首页排行榜抓取 Skills 数据并更新网页
数据来源: https://www.skills.sh (首页 initialSkills RSC 数据)

用法:
    python scripts/skills_crawler.py                # 完整爬取 (首页 top 100 + 详情)
    python scripts/skills_crawler.py --update       # 增量更新 (仅新/变更)
    python scripts/skills_crawler.py --top 200      # 仅抓取 top 200
    python scripts/skills_crawler.py --html-only    # 仅从缓存生成 HTML
"""

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ===== 配置 =====
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_FILE = DATA_DIR / "skills_cache.json"
OUTPUT_HTML = BASE_DIR / "pages" / "skills.html"
TEMPLATE_FILE = BASE_DIR / "scripts" / "skills_template.html"

HOMEPAGE_URL = "https://www.skills.sh"
MAX_WORKERS = 10
REQUEST_DELAY = 0.1
REQUEST_TIMEOUT = 15
MAX_RETRIES = 3

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SkillsCrawler/1.0)",
    "Accept": "text/html,application/xhtml+xml",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


# ===== Step 1: 从首页获取排行榜 =====
def fetch_homepage_ranking() -> list[dict]:
    """从 skills.sh 首页 RSC 数据中提取 initialSkills 排行榜"""
    print(f"  Fetching homepage: {HOMEPAGE_URL}")
    r = SESSION.get(HOMEPAGE_URL, timeout=30)
    r.raise_for_status()
    html = r.text

    # 在原始 HTML 中查找 initialSkills JSON 数组
    idx = html.find("initialSkills")
    if idx < 0:
        print("  Error: initialSkills not found in homepage")
        return []

    bracket_start = html.find("[{", idx)
    if bracket_start < 0:
        print("  Error: cannot find skill array start")
        return []

    # 找到匹配的结束括号
    depth = 0
    escape_next = False
    bracket_end = bracket_start
    for j in range(bracket_start, len(html)):
        c = html[j]
        if escape_next:
            escape_next = False
            continue
        if c == "\\":
            escape_next = True
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                bracket_end = j + 1
                break

    raw = html[bracket_start:bracket_end]
    # 反转义: \" -> "  and  \\ -> \
    raw = raw.replace('\\"', '"').replace("\\\\", "\\")

    try:
        skills = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  Error parsing JSON: {e}")
        return []

    print(f"  Found {len(skills)} skills from homepage")
    return skills


# ===== Step 2: 抓取单个 Skill 详情 =====
def scrape_skill_detail(skill: dict) -> Optional[dict]:
    """抓取单个 skill 详情页，提取描述"""
    source = skill.get("source", "")
    skill_id = skill.get("skillId", "")
    url = f"{HOMEPAGE_URL}/{source}/{skill_id}"

    for attempt in range(MAX_RETRIES):
        try:
            r = SESSION.get(url, timeout=REQUEST_TIMEOUT)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")

            # 从 JSON-LD 提取描述
            for ld in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(ld.string)
                except (json.JSONDecodeError, TypeError):
                    continue
                if data.get("@type") != "SoftwareApplication":
                    continue
                return {"description": data.get("description", ""), "url": data.get("url", url)}

            # fallback: og:description
            og_desc = soup.find("meta", property="og:description")
            if og_desc:
                return {"description": og_desc.get("content", ""), "url": url}

            return {"description": "", "url": url}

        except requests.RequestException:
            if attempt < MAX_RETRIES - 1:
                time.sleep(1 * (attempt + 1))
            continue

    return None


# ===== Step 3: 并发抓取详情 =====
def scrape_details(skills: list[dict], workers: int = MAX_WORKERS) -> dict:
    """并发抓取 top N skill 的详情页"""
    results = {}
    total = len(skills)
    done = 0
    errors = 0

    print(f"\n  Scraping details for {total} skills with {workers} workers...")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {}
        for skill in skills:
            future = pool.submit(scrape_skill_detail, skill)
            futures[future] = skill["skillId"]
            time.sleep(REQUEST_DELAY)

        for future in as_completed(futures):
            done += 1
            skill_id = futures[future]
            try:
                result = future.result()
                if result:
                    results[skill_id] = result
                else:
                    errors += 1
            except Exception:
                errors += 1

            if done % 20 == 0 or done == total:
                print(f"    Progress: {done}/{total} ({errors} errors)")

    print(f"  Done: {len(results)} details scraped, {errors} errors")
    return results


def categorize(name: str, description: str) -> str:
    """根据名称和描述自动分类"""
    text = (name + " " + description).lower()
    if any(k in text for k in ["design", "ui", "ux", "css", "style", "animation", "visual", "figma", "mockup"]):
        return "design"
    if any(k in text for k in ["test", "security", "audit", "vulnerability", "scan", "lint"]):
        return "testing"
    if any(k in text for k in ["deploy", "devops", "ci/cd", "docker", "kubernetes", "cloud", "azure", "aws"]):
        return "devops"
    if any(k in text for k in ["data", "ai", "ml", "model", "database", "analytics", "embedding"]):
        return "data"
    if any(k in text for k in ["api", "server", "backend", "auth", "database", "sql", "postgres"]):
        return "development"
    if any(k in text for k in ["document", "pdf", "docx", "pptx", "xlsx", "markdown", "latex"]):
        return "documentation"
    if any(k in text for k in ["marketing", "seo", "content", "social", "email", "campaign"]):
        return "marketing"
    if any(k in text for k in ["mobile", "ios", "android", "react native", "flutter"]):
        return "mobile"
    return "development"


# ===== Step 4: 缓存管理 =====
def load_cache() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"skills": [], "meta": {}}


def save_cache(data: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Cache saved: {CACHE_FILE}")


def incremental_update(existing: list[dict], new_data: list[dict]) -> list[dict]:
    by_id = {s["skillId"]: s for s in existing}
    updated = 0
    added = 0
    for skill in new_data:
        sid = skill["skillId"]
        if sid in by_id:
            old = by_id[sid]
            if old.get("installs", 0) != skill.get("installs", 0):
                updated += 1
        else:
            added += 1
        by_id[sid] = skill

    merged = sorted(by_id.values(), key=lambda x: x.get("installs", 0), reverse=True)
    print(f"  Incremental: {added} new, {updated} updated, {len(merged)} total")
    return merged


# ===== Step 5: 生成 HTML =====
def generate_html(skills: list[dict]):
    if not TEMPLATE_FILE.exists():
        print(f"  Template not found: {TEMPLATE_FILE}")
        return

    template = TEMPLATE_FILE.read_text(encoding="utf-8")

    top100 = skills[:100]
    top50 = skills[:50]

    # 生成 Top 100 JSON
    top100_js = json.dumps([{
        "rank": i + 1,
        "name": s["name"],
        "owner": s.get("source", "").split("/")[0],
        "installs": format_installs(s.get("installs", 0)),
        "cat": s.get("category", "development"),
        "desc": s.get("description", "")[:100],
        "link": s.get("url", f"https://www.skills.sh/{s.get('source', '')}/{s.get('skillId', '')}"),
    } for i, s in enumerate(top100)], ensure_ascii=False)

    # 生成 Top 50 JSON
    top50_js = json.dumps([{
        "n": i + 1,
        "name": s["name"],
        "owner": s.get("source", "").split("/")[0],
        "link": s.get("url", f"https://www.skills.sh/{s.get('source', '')}/{s.get('skillId', '')}"),
        "desc": s.get("description", ""),
    } for i, s in enumerate(top50)], ensure_ascii=False)

    # 生成分类统计
    cat_counts = {}
    for s in skills:
        cat = s.get("category", "development")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    categories_js = json.dumps([{"name": k, "count": v} for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])], ensure_ascii=False)

    # 生成作者排行
    owner_counts = {}
    for s in skills:
        owner = s.get("source", "").split("/")[0]
        owner_counts[owner] = owner_counts.get(owner, 0) + 1
    owners_js = json.dumps([{"name": k, "count": v} for k, v in sorted(owner_counts.items(), key=lambda x: -x[1])[:20]], ensure_ascii=False)

    # 替换模板占位符
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = template.replace("{{TOP100_DATA}}", top100_js)
    html = html.replace("{{TOP50_DATA}}", top50_js)
    html = html.replace("{{CATEGORIES_DATA}}", categories_js)
    html = html.replace("{{OWNERS_DATA}}", owners_js)
    html = html.replace("{{TOTAL_SKILLS}}", "418121")
    html = html.replace("{{UPDATE_TIME}}", now)

    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"  HTML generated: {OUTPUT_HTML}")


def format_installs(n: int) -> str:
    if n >= 1000000:
        return f"{n/1000000:.1f}M"
    if n >= 1000:
        return f"{n/1000:.1f}k"
    return str(n) if n > 0 else "—"


# ===== 主流程 =====
def main():
    parser = argparse.ArgumentParser(description="skills.sh 爬虫")
    parser.add_argument("--update", action="store_true", help="增量更新")
    parser.add_argument("--top", type=int, default=100, help="抓取 top N (默认 100)")
    parser.add_argument("--html-only", action="store_true", help="仅从缓存生成 HTML")
    parser.add_argument("--no-details", action="store_true", help="跳过详情页抓取")
    parser.add_argument("--workers", type=int, default=MAX_WORKERS, help="并发数")
    args = parser.parse_args()

    workers = args.workers

    print("=" * 60)
    print("  skills.sh 爬虫 — Claude Code Skills 榜单更新")
    print("=" * 60)

    # 加载缓存
    cache = load_cache()
    existing = cache.get("skills", [])

    if args.html_only:
        print("\n[Step 1] 从缓存生成 HTML...")
        if not existing:
            print("  Error: 无缓存数据，请先运行爬虫")
            sys.exit(1)
        skills = sorted(existing, key=lambda x: x.get("installs", 0), reverse=True)
    else:
        # 从首页获取排行榜
        print("\n[Step 1] 从首页获取排行榜...")
        raw_skills = fetch_homepage_ranking()
        if not raw_skills:
            print("  Error: 无法获取排行榜数据")
            sys.exit(1)

        # 取 top N
        top_n = args.top
        skills = raw_skills[:top_n]
        print(f"  Using top {len(skills)} skills")

        # 补充分类
        for s in skills:
            if "category" not in s:
                s["category"] = categorize(s.get("name", ""), s.get("description", ""))

        # 抓取详情页 (描述)
        if not args.no_details:
            print("\n[Step 2] 抓取详情页...")
            details = scrape_details(skills, workers=workers)
            for s in skills:
                sid = s["skillId"]
                if sid in details:
                    s["description"] = details[sid].get("description", s.get("description", ""))
                    s["url"] = details[sid].get("url", s.get("url", ""))
                elif "description" not in s:
                    s["description"] = ""

        # 合并数据
        print("\n[Step 3] 合并数据...")
        if args.update and existing:
            skills = incremental_update(existing, skills)
        else:
            # 按安装量排序
            skills.sort(key=lambda x: x.get("installs", 0), reverse=True)

        # 保存缓存
        cache = {
            "skills": skills,
            "meta": {
                "last_update": datetime.now().isoformat(),
                "total": len(skills),
                "source": "skills.sh",
            }
        }
        save_cache(cache)

    # 生成 HTML
    print("\n[Step 4] 生成 HTML...")
    generate_html(skills)

    print("\n" + "=" * 60)
    print(f"  完成! 共 {len(skills)} 个 skills")
    print(f"  缓存: {CACHE_FILE}")
    print(f"  网页: {OUTPUT_HTML}")
    print("=" * 60)


if __name__ == "__main__":
    main()
