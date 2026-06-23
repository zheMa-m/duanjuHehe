-- ============================================================================
-- 0003 营销活动模块：活动配置 + 留资 + 智能问卷 + 订单关联
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()）
--           0002_iap.sql（orders 表，用于 campaign_orders 外键引用）
--
-- 设计原则：
--   campaigns 是通用活动容器，不通过 campaign_type 枚举限制活动类型。
--   不同活动类型通过 config JSONB + 独立关联表扩展。
--   智能问卷是首个内置模块：questionnaire_sessions / questionnaire_answers / ai_reports。
--   活动与订单通过 campaign_orders 关联表连接，不污染通用 orders 表。
--
-- 表清单：
--   1. campaigns              — 营销活动配置（通用容器）
--   2. campaign_registrations — 留资/预约注册
--   3. questionnaire_sessions — 问卷会话主表
--   4. questionnaire_answers  — 答案事件流（append-only）
--   5. ai_reports             — 通用 AI 报告表
--   6. campaign_orders        — 活动-订单关联表（session_id / report_id / platform / plan）
--
-- 种子数据：h5-v2 新野兽派活动 + StarPath AI 占星活动（含完整智能问卷模板）
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. campaigns — 营销活动配置表（通用容器）                                ║
-- ║  不再使用 campaign_type 枚举；活动类型由 config + 关联表决定               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain       TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL,
  badge           TEXT NOT NULL,
  color_from      TEXT NOT NULL DEFAULT 'from-purple-600',
  color_to        TEXT NOT NULL DEFAULT 'to-indigo-600',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  cta_text        TEXT NOT NULL DEFAULT '立即预约',
  cta_url         TEXT,
  cover_image     TEXT,
  description     TEXT,
  features        JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(features) = 'array'),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ga_measurement_id  TEXT,
  meta_pixel_id      TEXT,
  tiktok_pixel_id    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

-- RLS: 公开读取仅限活跃活动
CREATE POLICY campaigns_read_public ON campaigns
  FOR SELECT TO public USING (is_active = true);

-- RLS: 管理员全权限
CREATE POLICY campaigns_admin_all ON campaigns
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_campaigns_active_sort ON campaigns(is_active, sort_order)
  WHERE is_active = true;

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. campaign_registrations — 留资/邮箱收集表                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaign_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  subdomain     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE,
  source        TEXT NOT NULL DEFAULT 'h5-form',
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  unsubscribed  BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations FORCE ROW LEVEL SECURITY;

-- RLS: 允许所有人匿名提交
CREATE POLICY campaign_registrations_insert_public ON campaign_registrations
  FOR INSERT TO public WITH CHECK (true);

-- RLS: 管理员全权限
CREATE POLICY campaign_registrations_admin_all ON campaign_registrations
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_campaign_registrations_subdomain ON campaign_registrations(subdomain);
CREATE INDEX IF NOT EXISTS idx_campaign_registrations_created ON campaign_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_source ON campaign_registrations(source);
CREATE INDEX IF NOT EXISTS idx_cr_sent_at ON campaign_registrations(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cr_campaign_source ON campaign_registrations(campaign_id, source);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. questionnaire_sessions — 问卷会话主表                                  ║
-- ║  一个用户的一次问卷填写 = 一个 Session                                    ║
-- ║  session_key: 前端生成的匿名标识，用于 session 恢复                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS questionnaire_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key   TEXT NOT NULL,
  gender        TEXT,                                 -- male | female
  birth_date    TEXT,
  birth_time    TEXT,
  birth_city    TEXT,
  full_name     TEXT,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'started'
                CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_sessions FORCE ROW LEVEL SECURITY;

-- RLS: 用户查看自己的 session
CREATE POLICY qs_user_select ON questionnaire_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS: 任何人可 INSERT（匿名用户）
CREATE POLICY qs_public_insert ON questionnaire_sessions
  FOR INSERT WITH CHECK (true);

-- RLS: 用户更新自己的 session
CREATE POLICY qs_user_update ON questionnaire_sessions
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS: 管理员全权限
CREATE POLICY qs_admin_all ON questionnaire_sessions
  FOR ALL USING (is_admin(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS idx_qs_campaign_id     ON questionnaire_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_qs_session_key     ON questionnaire_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_qs_user_id         ON questionnaire_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qs_status          ON questionnaire_sessions(campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qs_campaign_session
  ON questionnaire_sessions(campaign_id, session_key);

CREATE TRIGGER qs_set_updated_at
  BEFORE UPDATE ON questionnaire_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. questionnaire_answers — 答案事件流（append-only）                      ║
-- ║  每条记录 = 一次提交事件，不可变。同一 session+step+question_key 可多次      ║
-- ║  写入，以 answered_at 最新一条为准。                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES questionnaire_sessions(id) ON DELETE CASCADE,
  step          INTEGER NOT NULL,
  question_key  TEXT NOT NULL,
  answer_value  JSONB NOT NULL DEFAULT 'null'::jsonb,
  answered_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_answers FORCE ROW LEVEL SECURITY;

-- RLS: 任何人可 INSERT
CREATE POLICY qa_public_insert ON questionnaire_answers
  FOR INSERT WITH CHECK (true);

-- RLS: 通过关联 session 鉴权 SELECT
CREATE POLICY qa_user_select ON questionnaire_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questionnaire_sessions s
      WHERE s.id = questionnaire_answers.session_id
        AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- RLS: 管理员全权限
CREATE POLICY qa_admin_all ON questionnaire_answers
  FOR ALL USING (is_admin(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS idx_qa_session_id   ON questionnaire_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_session_step ON questionnaire_answers(session_id, step);
CREATE INDEX IF NOT EXISTS idx_qa_question_key ON questionnaire_answers(session_id, question_key);
CREATE INDEX IF NOT EXISTS idx_qa_answered_at  ON questionnaire_answers(answered_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. ai_reports — 通用 AI 报告表                                           ║
-- ║  设计为平台通用 AI 内容产出表，report_type 区分用途                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES questionnaire_sessions(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  report_type   TEXT NOT NULL DEFAULT 'astrology'
                CHECK (report_type IN ('astrology', 'summary', 'custom')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  content       JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY ar_user_select ON ai_reports
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY ar_admin_all ON ai_reports
  FOR ALL USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ar_user_id     ON ai_reports(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_campaign_id ON ai_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ar_session_id  ON ai_reports(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_status      ON ai_reports(status);

CREATE TRIGGER ar_set_updated_at
  BEFORE UPDATE ON ai_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. campaign_orders — 活动-订单关联表                                      ║
-- ║  将活动特有字段从 orders 表剥离，保持 orders 纯净                           ║
-- ║  session_id / report_id 通过 questionnaire_sessions / ai_reports 外键追踪   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaign_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES questionnaire_sessions(id) ON DELETE SET NULL,
  report_id     UUID REFERENCES ai_reports(id) ON DELETE SET NULL,
  platform      TEXT,                              -- ios | android | web
  plan          TEXT,                              -- trial-7d | monthly | yearly
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, order_id)
);

ALTER TABLE campaign_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_orders FORCE ROW LEVEL SECURITY;

-- RLS: 管理员全权限
CREATE POLICY co_admin_all ON campaign_orders
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_co_campaign_id ON campaign_orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_co_order_id    ON campaign_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_co_session_id  ON campaign_orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_co_report_id   ON campaign_orders(report_id) WHERE report_id IS NOT NULL;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed Data                                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 种子 1: h5-v2 新野兽派活动
INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text, sort_order
) VALUES (
  'h5-v2',
  '🎨 HEHE 营销 H5 v2 新野兽派',
  '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
  '全新 V2 体验',
  'from-green-400', 'to-emerald-600', TRUE,
  '立即体验',
  10
) ON CONFLICT (subdomain) DO NOTHING;

-- 种子 2: StarPath AI 占星活动（内置智能问卷模块）
-- questionnaire.flow 定义完整问卷流程，共 31 步
INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text,
  config, sort_order
) VALUES (
  'starpath',
  'StarPath — AI 占星报告',
  '个性化 AI 占星分析：认识你的星辰蓝图',
  'AI 星盘解读',
  'from-purple-600', 'to-indigo-600', TRUE,
  '开始测算',
  '{
    "pricing": {
      "trial_7d": 7.99,
      "monthly": 29.99,
      "currency": "USD"
    },
    "features": [
      "AI 出生星盘分析",
      "性格特征解码",
      "感情兼容性洞察",
      "关键机遇窗口"
    ],
    "questionnaire": {
      "version": "1.0.0",
      "flow": [
        {"step": 0,  "route": "/starpath/question-page-zero",   "type": "gender",        "key": "gender"},
        {"step": 1,  "route": "/starpath/question-page-one",    "type": "familiarity",   "key": "familiarity"},
        {"step": 2,  "route": "/starpath/question-page-two",    "type": "display",                              "desc": "intro-features"},
        {"step": 3,  "route": "/starpath/question-page-three",  "type": "multiselect",  "key": "focus"},
        {"step": 4,  "route": "/starpath/question-page-four",   "type": "display",                              "desc": "goal-confirm"},
        {"step": 5,  "route": "/starpath/question-page-five",   "type": "single",       "key": "relationship"},
        {"step": 6,  "route": "/starpath/question-page-six",    "type": "datepicker",   "key": "birthDate"},
        {"step": 7,  "route": "/starpath/question-page-seven",  "type": "timepicker",   "key": "birthTime"},
        {"step": 8,  "route": "/starpath/question-page-eight",  "type": "text",         "key": "birthCity"},
        {"step": 9,  "route": "/starpath/question-page-nine",   "type": "text",         "key": "fullName"},
        {"step": 10, "route": "/starpath/question-page-ten",    "type": "display",                              "desc": "alignment-complete"},
        {"step": 11, "route": "/starpath/问卷页面-问题1",         "type": "question",    "key": "q1"},
        {"step": 12, "route": "/starpath/问卷页面-问题2",         "type": "question",    "key": "q2"},
        {"step": 13, "route": "/starpath/问卷页面-问题3",         "type": "question",    "key": "q3"},
        {"step": 14, "route": "/starpath/问卷页面-问题4",         "type": "question",    "key": "q4"},
        {"step": 15, "route": "/starpath/问卷页面-问题5",         "type": "question",    "key": "q5"},
        {"step": 16, "route": "/starpath/问卷页面-问题6",         "type": "question",    "key": "q6"},
        {"step": 17, "route": "/starpath/问卷页面-问题7",         "type": "question",    "key": "q7"},
        {"step": 18, "route": "/starpath/问卷页面-问题8",         "type": "question",    "key": "q8"},
        {"step": 19, "route": "/starpath/问卷页面-问题9",         "type": "question",    "key": "q9"},
        {"step": 20, "route": "/starpath/问卷页面-问题10",        "type": "question",    "key": "q10"},
        {"step": 21, "route": "/starpath/问卷页面-问题11",        "type": "question",    "key": "q11"},
        {"step": 22, "route": "/starpath/问卷页面-问题12",        "type": "question",    "key": "q12"},
        {"step": 23, "route": "/starpath/问卷页面-问题13",        "type": "question",    "key": "q13"},
        {"step": 24, "route": "/starpath/问卷页面-问题14",        "type": "question",    "key": "q14"},
        {"step": 25, "route": "/starpath/问卷页面-问题15",        "type": "question",    "key": "q15"},
        {"step": 26, "route": "/starpath/问卷页面-问题16",        "type": "question",    "key": "q16"},
        {"step": 27, "route": "/starpath/问卷页面-问题17",        "type": "question",    "key": "q17"},
        {"step": 28, "route": "/starpath/问卷页面-问题18",        "type": "question",    "key": "q18"},
        {"step": 29, "route": "/starpath/question-page-twelve", "type": "display",                              "desc": "calculating"},
        {"step": 30, "route": "/starpath/问卷页面-填写邮箱",       "type": "email"},
        {"step": 31, "route": "/starpath/订阅-ios",               "type": "subscribe",    "platform": "ios"},
        {"step": 32, "route": "/starpath/订阅成功-ios",            "type": "display",                              "desc": "success"}
      ],
      "questions": [
        {"key": "gender",       "text": "I''am",                                     "textZh": "我是",    "options": [{"label": "Male",   "labelZh": "男性", "value": "male"},   {"label": "Female", "labelZh": "女性", "value": "female"}],            "ui": "image-card"},
        {"key": "familiarity",  "text": "How familiar are you with astrology?",      "textZh": "你对占星有多了解？", "options": [{"value": "Absolute Beginner (I only know my Sun sign)"}, {"value": "Intermediate (I know my Big 3 and basic concepts)"}, {"value": "Advanced (I understand aspects, houses, and transits)"}], "ui": "option-card"},
        {"key": "focus",        "text": "What is your main focus for today''s reading?", "textZh": "你今天最关注哪个方面？", "options": [{"value": "Decode my romantic destiny"},          {"value": "Unlock my wealth & success potential"}, {"value": "Manifest my dreams into reality"}, {"value": "Find inner peace & spiritual healing"}, {"value": "Navigate challenges & obstacles ahead"}, {"value": "All of the above"}], "multiSelect": true, "ui": "icon-card"},
        {"key": "relationship", "text": "What is your current relationship status?",  "textZh": "你目前的感情状况？", "options": [{"label": "Single",               "value": "single"}, {"label": "In a relationship",   "value": "in-relationship"}, {"label": "Married",               "value": "married"}, {"label": "In a complicated situation", "value": "complicated"}], "ui": "image-card-2x2"},
        {"key": "birthDate",    "text": "What is your exact date of birth?",          "textZh": "你的出生日期是？",    "subtitle": "Calculate the positions of the Sun, Moon, and other planets", "ui": "wheel-date"},
        {"key": "birthTime",    "text": "Do you know your exact birth time?",         "textZh": "你知道具体出生时间吗？", "subtitle": "Determine your rising sign and house placement.", "ui": "wheel-time"},
        {"key": "birthCity",    "text": "What is your city of birth?",                "textZh": "你的出生城市是？",    "subtitle": "Determine latitude and longitude, calculate precise star chart", "ui": "search-input"},
        {"key": "fullName",     "text": "What is your full name?",                    "textZh": "你的全名是？",        "subtitle": "Used to establish personal connections", "ui": "text-input"}
      ],
      "deepQuestions": [
        {"key": "q1",  "index": 1,  "text": "How satisfied are you with the direction your life is taking?",   "options": ["Thriving", "Just getting by", "Completely lost"]},
        {"key": "q2",  "index": 2,  "text": "Do you feel like you are living your true purpose, or just fulfilling expectations?", "options": ["Living my purpose", "Following expectations", "I don''t know what my purpose is"]},
        {"key": "q3",  "index": 3,  "text": "Do you believe in spirituality or a higher cosmic order?",        "options": ["Yes", "No", "I''m a \"spiritual but not religious\" person"]},
        {"key": "q4",  "index": 4,  "text": "How often do your worries affect your major life decisions?",     "options": ["All the time", "Often", "Sometimes", "Rarely"]},
        {"key": "q5",  "index": 5,  "text": "Do you make decisions with your head (logic) or your heart (intuition)?", "options": ["Head", "Heart", "A mix of both"]},
        {"key": "q6",  "index": 6,  "text": "Are you satisfied with your current love life?",                  "options": ["Yes", "No", "It''s complicated"]},
        {"key": "q7",  "index": 7,  "text": "Do you find yourself repeating the same patterns in relationships?", "options": ["Always", "Sometimes", "I''ve broken the cycle"]},
        {"key": "q8",  "index": 8,  "text": "Which \"Love Shadow\" resonates with you most?",                   "options": ["Fear of abandonment", "Fear of losing independence", "Fear of not being \"enough\""]},
        {"key": "q9",  "index": 9,  "text": "Is there someone from your past you still can''t fully let go of?", "options": ["Yes, I need closure", "I''ve moved on", "I''m not sure"]},
        {"key": "q10", "index": 10, "text": "In a partner, are you looking for a \"Soulmate\" or a \"Twin Flame\"?", "options": ["Soulmate (Stable & Healing)", "Twin Flame (Intense & Transformative)"]},
        {"key": "q11", "index": 11, "text": "How would you describe your current financial flow?",              "options": ["Abundant", "Stagnant", "Constant struggle"]},
        {"key": "q12", "index": 12, "text": "Do you feel your current job utilizes your innate cosmic talents?", "options": ["Fully", "Barely", "I have hidden talents I haven''t used yet"]},
        {"key": "q13", "index": 13, "text": "When making major life decisions, how confident do you feel?",     "options": ["Very confident", "Somewhat confident", "Not confident at all"]},
        {"key": "q14", "index": 14, "text": "What is your biggest obstacle to success right now?",              "options": ["Lack of clarity", "Fear of failure", "External circumstances"]},
        {"key": "q15", "index": 15, "text": "Do you believe you are \"destined\" for greatness, but something is blocking it?", "options": ["Yes, I feel it deeply", "I used to, but I''ve lost hope", "I''m skeptical"]},
        {"key": "q16", "index": 16, "text": "How do you handle uncertainty about the future?",                  "options": ["I embrace it", "I feel anxious", "I seek guidance"]},
        {"key": "q17", "index": 17, "text": "Are you aware of how the current Mercury Retrograde or Saturn Return is affecting you?", "options": ["Yes", "No", "I''ve heard of it but need details"]},
        {"key": "q18", "index": 18, "text": "If you could know the exact date of your next big opportunity, would you want to?", "options": ["Yes, I need to be prepared", "No, I''ll take it as it comes"]}
      ],
      "displayPages": {
        "intro-features": {
          "title": "That''s great! Our App is the perfect place to explore your cosmic potential",
          "subtitle": "An astrology reading dives into your unique natal placements to provide guidance on various life aspects",
          "features": ["Love & relationships", "Future forecasting", "Career and wealth", "Soul mission and growth"]
        },
        "goal-confirm": {
          "title": "Great! You just set your main goal:",
          "message": "We will do our best to help you!"
        },
        "alignment-complete": {
          "title": "Cosmic Alignment Complete!",
          "subtitle": "Your foundational profile is locked in",
          "message": "Interesting choice, [{name}]... Your Sun Sign craves success, yet your chart hints your current path strays from your soul''s blueprint.",
          "message2": "We''ll ask a few quick questions to find your hidden blocks and unlock your true potential."
        },
        "calculating": {
          "title": "[{name}], your stars are aligning",
          "subtitle": "We are calculating your exclusive cosmic blueprint..",
          "steps": [
            {"title": "Calculating Natal Placements",     "desc": "Analyzing your Sun, Moon, and Rising signs"},
            {"title": "Decoding Behavioral Patterns",     "desc": "Syncing your personality traits and decision style"},
            {"title": "Analyzing Relationship & Career Houses", "desc": "Scanning your 7th House of Love and 10th House of Success"},
            {"title": "Finalizing Your Monthly Forecast", "desc": "Pinpointing your critical windows of opportunity this month"}
          ]
        }
      }
    }
  }'::jsonb,
  50
) ON CONFLICT (subdomain) DO UPDATE SET
  config = EXCLUDED.config;

COMMIT;
