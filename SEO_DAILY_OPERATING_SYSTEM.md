# Glory Star Wear SEO / AEO 每日运营系统

更新时间：2026-08-30

## 北极星目标

把 `glorystarwearing.com` 建设为搜索引擎可稳定抓取和收录、在定制运动服核心主题上具有权威、可被 AI 答案引用，并持续产生有效 B2B 询盘的网站。

排名不是承诺值。所有决策以真实的索引、曝光、排名、点击、询盘和成交证据为依据，不以文章数量或主观评分代替结果。

## 当前基线

- 2026-08-29 巡检观测到本地与生产 sitemap 已从原 17 页契约继续扩展为 1,026 个 canonical：1,002 个产品详情页及 24 个其他页面；该扩展已上线，但尚未获得负责人确认作为新的长期索引契约。
- 1,026 个规范页面均进入本地 sitemap，除首页外页面都有可抓取站内入口；当前最大点击深度为 2，孤儿页为 0。
- 当前本地候选验证结果为 1,026 / 1,026 canonical、65 / 65 项发布前门禁、Organization 首页基准一致性 1,026 / 1,026；2026-08-29 发布后生产状态、canonical、索引指令与 Organization parity 均为 1,026 / 1,026。本次 2026-08-30 目录性能候选尚未部署，不能把旧生产构建门禁外推为新候选证据。
- 已建立 canonical、robots.txt、1,026 URL sitemap、Organization/Breadcrumb/Article/FAQ/Product 等适用结构化数据、统一 GA 标签、WhatsApp 询盘和样品站入口。
- 静态资源约 41 MB，保留较多 Elementor、WooCommerce 和插件运行时代码。
- 当前项目文件本身无法证明 GSC、Bing Webmaster、GA4 线上事件、Clarity、排名与真实收录状态已经验收；2026-08-29 的生产复查只证明 sitemap 与 1,026 / 1,026 canonical 页面已上线、可抓取且 canonical 一致，不等同于搜索引擎已经收录或获得排名。
- 没有获得证明前，不得宣称任何客户数、产能、认证、交期、MOQ、排名、流量或 AI 提及。

### 2026-08-19 本地技术基线

- `index.html`：389,682 bytes、52 张图片、329 个 ID、2 个询盘表单。
- title、description、canonical、viewport 和 H1 均为单一且存在。
- JSON-LD 可解析；页面内锚点目标存在；没有重复 ID；首页存在于 sitemap。
- HTML 引用的本地资源均存在；CSS 仅缺少 4 个旧版 IE EOT 字体引用，现代 WOFF/TTF 回退文件存在，不构成抓取阻断。
- 两个 Elementor 表单均由静态 WhatsApp 提交处理器接管。
- 以上仅证明仓库静态文件状态，不能替代生产环境状态码、渲染、Core Web Vitals、GSC 或 Bing 索引验证。

### 2026-08-19 页面架构进展

- 建立 `SEO_PAGE_MAP.md`，为首页、品类页、能力页、证据页与转化页分配唯一搜索意图。
- 新增 `/private-label-activewear/`，具备独立 title、description、canonical、H1、Open Graph、Breadcrumb 与可见 FAQ 内容。
- 首页已增加上下文内链；sitemap 已加入新 URL。
- 本地审计覆盖 2 个 HTML 页面，页面基础项、JSON-LD、资源路径、canonical 唯一性和 sitemap 覆盖均通过。
- 新页面尚未部署，因此生产状态码、移动端截图、GSC 提交与实际收录仍待验证。

### 2026-08-19 Yoga Wear 主题扩展

- 新增 `/yoga-wear-manufacturer/`，与首页的广义制造商意图、`/private-label-activewear/` 的服务意图区分。
- 页面覆盖瑜伽裤、运动内衣、套装、项目 brief、款式决策和采购 FAQ，并避免使用未经确认的 MOQ、交期或性能数字。
- 首页、Private Label 页面与 Yoga Wear 页面形成上下文双向内链。
- 新增共享转化追踪脚本；当前统一口径为：直接 WhatsApp 点击发送 `whatsapp_click`，样品站点击发送 `sample_store_click`，只有完成结构化询盘表单才同时发送 `quote_form_complete` 与 `generate_lead`。
- 当时 sitemap 增至 3 个 canonical URL；本地多页面审计通过，仍待部署后验证生产事件与索引状态。

### 2026-08-19 Sports Bra 商业主题扩展

- 新增 `/sports-bra-manufacturer/`，承担 sports bra manufacturer、custom sports bra 和 private label sports bra 意图。
- 页面以可验证的采购决策为中心：活动场景、覆盖度、肩带、下围、罩杯、尺码、品牌资料和样品验收；没有把“高支撑”等主观标签写成未经测试的事实。
- 首页、Yoga Wear、Private Label 与 Sports Bra 页面形成三层上下文内链。
- 页面提供带预填需求的直接 WhatsApp 入口，并以 `whatsapp_click` 标记该入口。
- 当时 sitemap 增至 4 个 canonical URL；本地多页面审计、资源检查、JSON-LD 解析、内部链接和转化追踪检查通过。

### 2026-08-19 Custom Leggings 商业主题扩展

- 新增 `/custom-leggings-manufacturer/`，承担 custom leggings manufacturer、private label leggings 与 workout leggings 意图。
- 内容覆盖腰型、长度、无缝/裁剪缝制路线、口袋、面料方向、品牌资料和样品验收。
- 对 squat proof、compression 等表达采用“先定义测试、再验证样品”的证据标准，不把营销词直接写成性能事实。
- 首页、Yoga Wear、Private Label 与 Leggings 页面建立上下文链接；Sports Bra 页面在页脚提供相关品类路径。
- 当时 sitemap 增至 5 个 canonical URL；本地多页面SEO、JSON-LD、资源、内部链接、转化事件与XML验证通过。

### 2026-08-19 Activewear Sets 商业主题扩展

- 新增 `/activewear-sets-manufacturer/`，承担 activewear sets manufacturer、private label workout sets 和 coordinated activewear sets 意图。
- 页面解决套装特有问题：单品组合、固定/混合尺码、颜色一致性、SKU与库存逻辑、统一品牌和组合包装。
- Sports Bra 与 Leggings 作为套装组件页被上下文引用；首页、Yoga Wear 与 Private Label 页面链接回套装页。
- 页面接入 `whatsapp_click`，WhatsApp 预填内容明确为 activewear set 项目。
- 当时 sitemap 增至 6 个 canonical URL；多页面SEO、Schema、资源、内链、转化事件、XML和diff检查通过。

### 2026-08-19 Custom Activewear Process 权威能力页

- 新增 `/custom-activewear-process/`，承担 custom activewear manufacturing process、sampling process 与 OEM sportswear process 信息意图。
- 内容基于官网已有的 Contact、Catalog、Customize、Payment、Shipping 五步流程，并增加买家可执行的 brief、规格、样品反馈和审批记录规则。
- 所有核心商业页导航均链接到统一流程页；流程页反向链接 Sports Bra、Leggings、Activewear Sets、Yoga Wear 与 Private Label。
- 页面使用 Article、Breadcrumb 与可见 FAQ Schema；物流方式仅复述官网已有的 express、air、rail、sea 信息。
- 当时 sitemap 增至 7 个 canonical URL；多页面SEO、结构化数据、资源、内部链接、转化事件与XML验证通过。

### 2026-08-19 Activewear Fabrics 权威能力页

- 新增 `/activewear-fabrics/`，承担 activewear fabric selection、fabric for leggings 与 sports bra fabric 等信息意图。
- 页面把 composition、weight、stretch、recovery、hand feel、compression direction、coverage、surface 与 color 组织成可比较的 fabric brief。
- 明确 composition/GSM 不能单独证明性能；面料必须经过规格比较、swatch 与目标颜色成衣样品三阶段确认。
- Process、Yoga Wear、Sports Bra 和 Leggings 页面建立面料上下文内链；面料页反向链接产品和流程页。
- 页面接入 `whatsapp_click`，使用 Article、Breadcrumb 与可见 FAQ Schema。
- 当时 sitemap 增至 8 个 canonical URL；多页面SEO、Schema、资源、内链、转化事件、XML和diff检查通过。

### 2026-08-19 Activewear Quality Control 权威证据页

- 新增 `/activewear-quality-control/`，承担 activewear quality control、sportswear inspection 与 garment quality plan 意图。
- 页面明确是买家与供应商需项目化确认的控制框架，不声称所有检查、测试或抽样方案已经默认执行。
- 框架包含规格/样品、材料、过程与出货放行四个 gate，并覆盖测量、工艺、品牌、包装、变更与不符合项记录。
- Process、Fabrics、Sports Bra、Leggings 与 Sets 页面链接到统一QC框架；QC页反向链接产品、面料和流程。
- 页面接入 `whatsapp_click`，使用 Article、Breadcrumb 与可见 FAQ Schema。
- 当时 sitemap 增至 9 个 canonical URL；多页面SEO、Schema、资源、内链、转化事件、XML和diff检查通过。

### 2026-08-19 About / Entity 信任页

- 新增 `/about-glory-star-wear/`，统一 Glory Star Wear 与 `Guangzhou Glory Star Electronic Technology Co., Ltd.` 的品牌/法律名称关系。
- 页面只使用已在官网发布的广州/广东/中国所在地、两组电话、产品范围、OEM/ODM定位和官方社交账号。
- Organization Schema 增加 legalName、sales ContactPoint、Instagram、YouTube、TikTok、Pinterest 与 Facebook sameAs；未添加缺失的街道地址、邮箱、认证、产能或客户数字。
- 首页公司名称与 Private Label 导航链接至 About 实体页；About 页反向链接服务、产品与流程页面。
- Sample Store 点击使用 `sample_store_click`，直接 WhatsApp 使用 `whatsapp_click`。
- 当时 sitemap 增至 10 个 canonical URL；多页面SEO、Schema、资源、内链、事件、XML和diff检查通过。

本地复查命令：

```bash
node scripts/seo-audit.mjs
```

生产环境每日复查命令：

```bash
node scripts/production-seo-check.mjs
```

生产检查失败必须优先处理；它用于发现“本地通过但生产未部署”、sitemap 漏页、页面 404、canonical 漂移、noindex 和主域跳转异常。

生产发布候选构建与验收：

```bash
vercel build --prod
node scripts/postbuild-check.mjs
```

构建后门禁要求 sitemap 中 17 个页面全部进入部署包、没有额外规范 HTML、404/robots/sitemap/共享资源完整、内部 SEO 文档与环境文件不泄露，并验证 `www` 跳转及自定义 404 路由。

首次发布或页面真实更新后的 IndexNow 流程：

```bash
node scripts/indexnow-submit.mjs
node scripts/indexnow-submit.mjs --verify-production
node scripts/indexnow-submit.mjs --submit
```

默认模式只显示待提交 URL，不联网；生产验证要求根目录 key 与所选 canonical URL 全部可访问后才允许提交。日常只用重复的 `--url https://glorystarwearing.com/.../` 参数提交本次新增或更新页面，不重复推送未变化 URL。HTTP 200/202 只证明 IndexNow 收到通知，不得表述为已抓取、已收录或获得排名。

## 每日执行算法

每天只完成一个最高价值、可验证的闭环，不盲目批量生产内容。

1. 保护现场：检查 Git 状态和最近改动，不覆盖用户未完成的工作。
2. 验证基线：运行 `node scripts/seo-audit.mjs` 和 `node scripts/predeploy-check.mjs`；可以安全联网时再运行 `node scripts/production-seo-check.mjs`，不得把本地通过写成生产通过。
3. 收集证据：优先读取 GSC、Bing、GA4、Clarity、询盘质量回填和固定 AI 问题集；无法访问时明确写“待验证”，不得填 0 或估计值。
4. 按优先级选择一项：
   - P0：阻断抓取、索引、渲染、移动端使用或询盘的故障。
   - P1：已有曝光且排名 8–20 的高商业意图页面。
   - P2：缺失的核心品类页、制造能力页、流程页、证据页。
   - P3：内容衰减、内链、结构化数据、图片和性能改进。
   - P4：只有在意图不重复且有真实资料支撑时才新增文章。
5. 修改并验证：每天最多完成一个闭环；检查 HTML、链接、元数据、Schema、sitemap、移动端风险、询盘路径和适用构建门禁，保存可复核证据。
6. 决定是否提醒：只有新增 P0/P1、可验证指标变化、完成实质闭环或需要人工决定时提醒；其余巡检安静返回。
7. 中文汇报：今日证据、选择理由、改动、目标意图、验证结果、指标变化、数据缺口、下一候选项、需要的人工资料。

### 每日完成标准

- 技术候选：17 / 17 个 canonical 页面通过本地契约，审计错误 0、孤儿页 0、首页最大点击深度 ≤ 3；如数字变化，必须解释页面增删依据。
- 生产状态：最近成功抽查为 2026-08-27，17 / 17 canonical 页面、生产 sitemap、索引指令、Organization 核心实体资料与本地发布版本一致，`www` 首页及深层路径永久跳转到主域；任何后续改动仍须重新以真实 HTTP 抓取建立基线。
- 转化路径：直接入口为 `whatsapp_click`，结构化表单为 `quote_form_complete` + `generate_lead`，样品站为 `sample_store_click`；这些均只是行为信号。
- 工作产出：一天最多关闭一个 P0/P1/P2/P3/P4 事项，并留下命令输出、数据源或可复现浏览器证据。
- 停止条件：涉及部署、IndexNow 提交、站外发布、广告、外联、隐私/Consent/法律文本或缺失的业务事实时，停下并请求明确授权或资料。

## 第一阶段：0–30 天

目标是把“一个首页”升级成可形成主题权威的网站骨架。

- 验收 GSC Domain 属性、Bing Webmaster、GA4 关键事件、Clarity 和可用性监控。
- 验收 robots、canonical、HTTPS、主域统一、sitemap、404、移动端和实际渲染。
- 建立关键词—页面映射，确保一个页面对应一个主要搜索意图。
- 优先规划并发布独立页面：Custom Activewear Manufacturer、Private Label Activewear、Yoga Wear、Gym Wear、Sports Bras、Leggings、Activewear Sets、Custom Manufacturing Process、MOQ/Sampling、Fabric & Quality Control、About/Factory、Contact/Request a Quote。
- 每个页面必须具有独立 title、description、canonical、H1、正文、面包屑/内链和可验证信息。
- 重要页面距首页不超过三次点击，孤儿页为零。
- 将直接 WhatsApp 的 `whatsapp_click`、结构化询盘的 `quote_form_complete` + `generate_lead`、样品站出站的 `sample_store_click` 分开验收。

30 天验收：核心页面体系上线；技术阻断为零；提交的有效页面均进入发现/抓取流程；形成第一份真实基线报告。

## 第二阶段：31–60 天

- 根据 GSC 查询和买家问题扩展第一个主题集群，避免关键词内耗。
- 发布真实能力与证据内容：打样流程、MOQ、面料选择、Logo 工艺、质量控制、交期和运输；没有证据的数字不写。
- 创建至少三类高商业意图页面：供应商对比、选型指南、验厂/采购清单。
- 补齐 Organization、Breadcrumb、Product/Service（适用时）结构化数据，不添加页面不可见的评价或声明。
- 建立来自首页和已收录页面的上下文内链。
- 建立统一的公司名称、地址、电话和第三方实体资料，但站外发布需人工批准。

60 天验收：出现稳定非品牌曝光；能识别首批具体查询和页面；内容开始形成明确主题集群；询盘来源可追踪。

## 第三阶段：61–90 天

- 每周固定处理 GSC 中排名 8–20 且具有商业价值的机会词。
- 更新有曝光但 CTR 或内容匹配度偏低的页面。
- 发布第一份基于真实工厂数据的数据资产或采购研究；资料不足则延期，不编造。
- 每月用固定买家问题测试 AI 品牌提及与引用页面，仅记录可复现结果。
- 根据 Clarity 与关键事件数据做单变量转化实验。
- 复盘渠道、页面、查询、询盘质量和响应速度，淘汰无证据动作。

90 天验收：核心长尾词进入 Top 20 的数量持续增加；自然曝光形成上升趋势；有效询盘可归因；至少一个主题集群具有可复用数据和证据。

## 固定节奏

### 每天

- 09:00 自动检查本地候选、生产差异、索引/抓取异常、表单与 WhatsApp 路径；没有新证据时不打扰。
- 查看最近 7/28 天变化，区分正常波动和真实异常；无法访问数据源时保持“待验证”。
- 完成并验证一个最高优先级闭环；不以批量页面数代替结果。

### 每周一

- 汇总有效索引页、排除原因、非品牌曝光/点击、Top 20 查询、有效询盘和 AI 提及。
- 只选择本周一个技术/索引目标、一个排名/AEO 目标和一个转化目标；每项目标必须有基线、动作、负责人、期限和验收证据。

### 每月首个工作日

- 输出 30 天复盘：做了什么、什么有效、什么无效、证据是什么。
- 更新关键词—页面映射和内容衰减清单。
- 按 URL 决定保持、更新、合并或延后，只确定下月三项最高价值重点。

## KPI

- 技术：200 状态、正确 canonical、可抓取、移动端可用、结构化数据有效、无孤儿页。
- 索引：有效索引页数量、发现未索引/抓取未索引原因、提交到收录的周期。
- 可见度：非品牌曝光与点击、Top 3/10/20 查询数、商业意图词的页面级变化。
- AEO：固定问题集中品牌提及次数、引用页面、引用内容类型。
- 转化：直接 WhatsApp 点击、结构化询盘完成、样品站点击、有效询盘、页面转化率、首响时间；事件触发不等于消息发送或有效询盘。
- 业务：合格询盘率、样品订单和可归因成交；需要业务团队回填。

## 红线

- 不保证排名和收录，不伪造测试结果或权威背书。
- 不生成大量低价值、重复意图或仅为凑字数的 AI 内容。
- 不购买链接、不做站群、不隐藏关键词、不滥用 Schema。
- 不未经授权自动部署、投广告、联系客户或发布站外内容。
- 不未经授权提交 IndexNow，也不自行编写或宣称隐私、Cookie、Consent 或法律合规结论。
- 不因追求页面速度破坏询盘、分析、可访问性或移动端体验。
- 不把手册中的统计数字直接当作本站事实或对外宣传依据。

## 2026-08-30：产品目录首屏负载闭环

- 尝试通过现有浏览器会话读取 Google Search Console，两个入口均未在时限内完成加载；GSC 有效索引、查询、曝光、点击与排名继续记为 `待验证`，没有用 0、sitemap 数量或主观判断替代。
- 代码审计确认 `/products/` 的单页 HTML 为 1,178,310 bytes，首屏同时包含 1,002 张完整商品卡片和 1,002 项 ItemList；这是可复现的页面负载与 DOM 风险，不等同 Core Web Vitals 实测。DevTools 性能跟踪连接当前未配置，因此 LCP、CLS、INP 与 TBT 仍为 `待验证`。
- 将目录改为渐进增强：HTML 首屏只渲染 24 张商品卡片，完整 1,002 条商品数据放入交互时才请求的 `/products/catalog-index.json`；搜索、分类和“加载更多”始终只渲染当前 24 / 48 张匹配卡片，不在首次交互时插入全部 DOM。
- 为无 JavaScript 用户和搜索爬虫保留 1,002 条可见、可展开的紧凑商品索引链接；ItemList 只描述首屏 24 个最新款式。页面 canonical 数量保持 1,026，不新增分页或筛选重复 URL，孤儿页保持 0，首页最大点击深度保持 2。
- `/products/` HTML 从 1,178,310 降至 205,588 bytes，减少 972,722 bytes（82.55%）；按需 JSON 为 446,148 bytes，不进入首屏请求。该文件体积变化是本地静态证据，不宣称等量提升排名、流量或 Core Web Vitals。
- 浏览器复验通过：初始 24 卡片；加载更多后仅渲染 48 卡片且状态为 `1002 products found. Showing 48.`；SKU 搜索返回匹配集；Seamless 分类报告 112 个匹配并只渲染 24 个。审计新增 350 KB HTML 预算、24 首屏卡片、1,002 feed/紧凑链接/目标文件一致性门禁。
- 最终本地 `seo-audit` 错误 0、1,026 canonical、孤儿页 0、最大点击深度 2，65 / 65 发布前门禁通过；受治理发布包复核为 1,002 产品、7,994 媒体、1,026 canonical 与 3 个治理页完整。
- `vercel build --prod` 因当前会话缺少 Vercel 远程制品凭据，在缓存恢复前主动停止；本次候选没有部署、没有提交 IndexNow、没有推送或提交 Git，旧生产版本不受影响。部署前必须重新获得构建凭据并运行构建后门禁。

## 2026-08-29：Organization 并发守门确定性闭环

- 巡检发现本地与生产 sitemap 从昨日 1,018 增至 1,026：产品详情页由 999 增至 1,002，并新增 Support、Contact、Privacy Policy、Terms of Use 与 Cookie Notice 等页面；原 17 页索引契约仍未得到负责人确认扩展。
- 本地候选通过 `seo-audit` 与 64 项发布前门禁：1,026 个 canonical、错误 0、孤儿页 0、首页最大点击深度 2；这不代表生产总检查通过。
- 修复前的真实生产抓取完成 1,026 / 1,026，页面状态、canonical 与索引指令均正常；但 `/cookie-policy/` 的 Organization JSON-LD 缺少首页实体中的电话与地址，生产检查因此失败。
- 修复 `production-seo-check.mjs` 的并发基准竞态：并行抓取前固定从本地首页读取 Organization 基准，避免由最先完成的任意页面决定实体参考；语法检查与再次生产抓取均复现同一 Cookie Notice 差异。
- 用户要求继续优化后，仅把首页及其他治理页已使用的电话 `+86 180 2075 5949` 与 Xiamen / Fujian 地址同步到 Cookie Notice 的 Organization JSON-LD；没有改写可见 Cookie、Privacy 或 Terms 法律正文，也未自行宣称法律/Consent 合规。
- `seo-audit.mjs` 新增全站 Organization 首页基准门禁，统一比较 `@id`、品牌名、法定名称、URL、电话、邮箱与地址；修复后本地 1,026 页审计和 64 项发布前门禁通过。
- `verify-release-output.mjs` 与 `postbuild-check.mjs` 新增非产品核心页面源码一致性检查，成功识别原有不可变发布缓存仍含旧 `/cookie-policy/`，阻止把“源文件已修复、构建产物仍旧”误当成可发布版本。
- 使用本地受治理商品镜像重建发布输出，验证通过：1,002 个产品页、7,994 个目录媒体文件、1,026 个 canonical 与 3 个治理页面完整，Cookie Organization 与源码一致；Vercel 远程 core artifact 与旧 `.vercel/output` 仍需在实际部署前刷新并重新执行 production build 门禁。
- 经用户明确要求提交部署，将通过 21 项构建后门禁的 Vercel Build Output 以预构建压缩包发布到 production；部署 `dpl_5MVm5wMZimJbUHB3CkkURgCpgSWa` 状态 READY 并已绑定 `https://glorystarwearing.com/`。
- 发布后重新抓取生产 sitemap 与全部 1,026 个 URL：状态、canonical、索引指令和 Organization parity 1,026 / 1,026，Cookie Notice 实体差异已关闭；`www` 首页与询盘深路径永久跳转继续通过。
- 未提交 IndexNow，未推送或提交 Git 代码。Vercel 远程 core artifact 仍需在未来采用源码构建流程前刷新；当前生产版本来自已验证的本地预构建产物。
- 当前没有 GSC、Bing Webmaster、GA4 或 Clarity 数据连接；定向公开搜索没有取得可复核结果，不能据此把有效索引、排名、流量、AI 引用或询盘记为 0，继续标记 `待验证`。

## 2026-08-28：产品目录索引契约漂移巡检闭环

- 本地与生产 sitemap 均从既定 17 页扩展为 1,018 个 canonical，新增产品中心、999 个产品详情页与 FAQ；本轮没有执行部署、IndexNow、推送或提交代码，线上扩展发生在本轮巡检之前。
- 本地审计与 30 项发布前门禁通过：1,018 个 canonical、错误 0、孤儿页 0、首页最大点击深度 2；生产逐页检查 1,018 / 1,018、Organization parity 1,018 / 1,018。
- 对 999 个产品详情页做模板质量抽查：title、canonical、SKU 与 Product Schema 均为 999 / 999；title、canonical 与 SKU 全部唯一；997 个唯一 description、972 个唯一 H1；可见文本词数中位数 335。
- 发现 6 个详情页使用明确标注 `product image pending verification` 的占位图且 Product Schema 没有 image，生产抽查确认该状态已上线；另有 2 组重复 description 和 20 组重复 H1，是否影响搜索表现必须等待真实索引与查询数据判断。
- 当前可用工具中没有 GSC、Bing Webmaster、GA4 或 Clarity 数据连接，因此 1,018 个 URL 的有效索引、非品牌排名、流量、AI 引用与询盘全部继续记为 `待验证`，不得以 sitemap 数量代替。
- 今日闭环为完成新增目录的本地—生产清点与风险分层；在负责人确认 999 个产品详情页是否应全部进入长期索引契约、并提供或批准 6 个缺失产品图之前，不自动扩写、删除、noindex、部署或提交 IndexNow。

## 2026-08-27：实体资料生产一致性守门闭环

- 巡检发现本地与生产内容均已使用新的公开实体资料：`厦门广兴恒进出口有限公司`、Xiamen / Fujian、`+86 180 2075 5949`、`kevin@glorystarwears.com`，并引用新的产品集合图与团队图；两张生产图片均返回 HTTP 200。
- 这些证据只证明网站当前展示内容与发布一致，不代表已独立核验工商登记、法律主体资格或图片人物身份。
- 原生产巡检只检查状态码、canonical、索引指令、sitemap 与域名跳转，可能在实体字段只更新部分页面或生产版本漂移时仍显示通过。
- 增强 `scripts/production-seo-check.mjs`：逐页解析 Organization JSON-LD，先检查本地 17 页的 `name`、`legalName`、`telephone`、`email` 与地址是否以首页为同一实体，再与对应生产页逐项比对。
- 验证结果：本地审计 17 个 canonical、错误 0、孤儿页 0、首页最大点击深度 2；30 / 30 发布前门禁通过；生产 sitemap 17、逐页检查 17、Organization parity 17 / 17，线上版本保持可索引。
- 当前没有可用的 GSC、Bing Webmaster、GA4 或 Clarity 数据连接；公开搜索仅出现域名注册目录，不能作为本站收录、排名或品牌权威证据，相关指标继续记为 `待验证`。
- 本轮只完成实体一致性生产守门闭环；未修改网站展示内容，未部署、未提交 IndexNow、未推送或提交代码。

## 2026-08-26：发布后稳定性巡检闭环

- 保护现有未提交工作后运行本地审计：17 个 canonical 页面、错误 0、孤儿页 0、首页最大点击深度 2；30 / 30 发布前门禁通过。
- 真实生产复查通过：本地 sitemap 17、生产 sitemap 17、逐页检查 17；线上版本继续匹配本地 canonical 发布契约并保持可索引，`www` 永久跳转未回归。
- robots.txt 对 ClaudeBot、Google-Extended 与 GPTBot 的封禁警告没有变化，仍作为已有 AI 抓取政策待决项，不在未授权情况下修改。
- 当前没有可用的 GSC、Bing Webmaster、GA4 或 Clarity 数据连接；定向公开搜索未返回可归属于本站的可靠结果，因此收录、排名、流量、AI 引用和询盘继续记为 `待验证`，不记为 0。
- 本轮未发现新的 P0/P1，不修改网站内容，不部署、不提交 IndexNow、不推送或提交代码；今日闭环为确认发布后生产稳定性并更新证据日期。

## 2026-08-25：官方 Glory Star Wear 品牌资产闭环

- 用户提供并确认官方 Glory Star Wear Logo；站内资产只做裁边和等比缩放，没有重绘、改色或生成替代品牌图形。
- 首页、16 个 canonical 内容页和品牌 404 均改用官方图形；18 个页面 favicon、首页 Apple Touch Icon、192 px 图标与 Tile Image 已从旧 SPARK 资产切换到 `/assets/brand/`。
- 17 个 canonical 页面的 Organization Schema 均新增同一官方 Logo `ImageObject`，主页同时增加可见官方 Logo，轻量页面页眉增加官方图形与 `GLORY STAR WEAR` 文本锁定。
- 首页产品图片替代文本和询盘名称中的 `Sparkle`、`Sparky Worldwide Inc` 已改为 Glory Star Wear 自有、客观的产品描述。
- 浏览器渲染发现旧 YouTube 视频动态标题仍显示 SPARK；该视频及对应 Open Graph 视频声明已移除，剩余无旧品牌标题的生产流程视频改为单列展示，旧视频 ID 同步进入门禁。
- 审计与发布前门禁新增旧品牌回归阻断：任何对外 HTML 再出现独立 `Spark`、`Sparky`、`Sparkle` 或旧 favicon 文件名都会失败。内部 `_url_map.json` 保留原始采集来源记录，但已由 `.vercelignore` 排除，不属于发布网站。
- 验证结果：17 个 canonical、审计错误 0、孤儿页 0、最大点击深度 2，30 / 30 发布前门禁与 16 / 16 构建后门禁通过，production 候选共 443 个静态文件；浏览器确认首页和 About 页官方 Logo 正常加载，延迟脚本执行后也没有旧品牌文本或旧视频。
- 旧 SPARK favicon 文件已从发布版本删除；随后经用户明确授权发布到 Vercel 生产环境，未提交 IndexNow、未推送或提交代码。

## 2026-08-25：首页询盘来源阻断闭环

- 本地复核发现两个首页询盘表单把获客来源设为必填，但只允许 Google、社媒或朋友，导致 Bing、AI 助手、直接访问、展会来源或不愿披露来源的买家无法如实完成表单。
- 两个来源字段已改为可选，并统一补充 Google Search、其他搜索引擎、AI assistant、社媒、转介绍、展会和 Direct or other；来源留空时不会进入 WhatsApp 草稿。
- `seo-audit` 新增门禁：阻断来源字段再次变为必填，或缺失空选项、Bing/搜索、AI assistant 与 Direct/other 等真实来源入口。
- 验证结果：17 个 canonical 页面、审计错误 0、孤儿页 0、首页最大点击深度 2，30 / 30 发布前门禁与 16 / 16 构建后门禁通过，最新 production 候选为 443 个静态文件；本地真实浏览器在填写其余必填项、来源保持空值时验证两个首页表单均为有效，控制台无 error 或 warning。
- 2026-08-25 发布前生产只读复查仍显示旧版本：生产 sitemap 只有首页，16 个候选路径返回 404，`www` 的询盘深路径没有永久跳转；robots 仍封禁 ClaudeBot、Google-Extended 与 GPTBot。
- 随后经用户明确授权完成生产部署，并修复发布后发现的 `www` 尾斜杠深层路径规范化问题；发布后检查确认 sitemap 与 canonical 页面均为 17 / 17、页面可索引、`www` 永久跳转有效。未提交 IndexNow，未推送或提交代码。
- 生产收录、排名、GA4/Clarity 事件、AI 引用和有效询盘仍为 `待验证`。

## 2026-08-25：生产发布与域名规范化闭环

- 使用已通过 30 / 30 发布前门禁和 16 / 16 构建后门禁的 Vercel production 预构建产物发布，生产别名为 `https://glorystarwearing.com/`。
- 首次发布后真实 HTTP 验收发现 `https://www.glorystarwearing.com/request-a-quote/` 返回 200 而非永久跳转；根因是尾斜杠路径没有命中原有 host redirect 规则。
- 为尾斜杠深层路径增加独立 `www` host 308 规则，重新构建、通过门禁并二次发布；最终 `node scripts/production-seo-check.mjs` 通过。
- 最终证据：本地 sitemap 17、生产 sitemap 17、逐页检查 17；17 / 17 页面与本地 canonical 契约一致并保持可索引，`www` 首页与深层路径永久跳转到主域。
- 生产首页 HTML 包含官方 Glory Star Wear Logo、官方 favicon 与 Organization Logo Schema，官方 Logo 静态文件返回 200；旧 `Spark`、`Sparky`、`Sparkle`、旧 favicon 文件名无匹配。
- robots.txt 仍对 ClaudeBot、Google-Extended 与 GPTBot 设置封禁；这记录为 AI 抓取政策待决项，不擅自改写。GSC/Bing 收录、排名、GA4/Clarity 事件、AI 引用和有效询盘仍为 `待验证`。

## 2026-08-24：生产差异复核

- 本地 `seo-audit` 与发布前门禁继续通过：17 个 canonical 页面、错误 0、孤儿页 0、首页最大点击深度 2、30 / 30 项发布前检查通过。
- 生产检查实际抓取 17 个目标 URL：生产 sitemap 仍只有首页，另外 16 个 canonical 路径全部返回 404；`www` 下的 `/request-a-quote/` 也没有永久跳转到主域。
- 生产 `robots.txt` 继续封禁 ClaudeBot、Google-Extended 与 GPTBot；当前只记为 AI 抓取策略警告，不把解除封禁写成已获授权的业务决定。
- 今日闭环是把生产事实同步回运营系统、增长记分卡和关键词—页面映射，避免“本地候选”被误记为“已经上线”。没有部署、提交 IndexNow 或修改生产环境。
- 下一动作需要用户明确决定：先创建 Vercel Preview 验收，或授权生产部署；部署前继续保持线上收录、排名、GA4 事件和 AI 引用为“待验证”。

## 2026-08-21：跨层审计、浏览器验收与每日增长闭环

- 由技术 SEO、内容/AEO 与转化三个方向并行复核，修复了尾斜杠重复 URL 风险、robots 子串误判、候选环境抓错生产 canonical、可变资源长期 immutable 缓存、首页日期漂移和 Buyer Guides 可见列表与 ItemList 不一致。
- 重构询盘与事件治理：直接 WhatsApp 使用 `whatsapp_click`；完成结构化表单才触发 `quote_form_complete` + `generate_lead`；样品站使用 `sample_store_click`。移除表单控件的原生 `name`，避免 JavaScript 失效时姓名、邮箱、电话与自由文本进入 URL、历史或分析日志。
- 修复 WhatsApp 弹窗判断导致同一次提交同时打开新窗口并跳走原页的问题，增加重复提交锁；首页三个 Google tag 目标统一为一个 `GT-W6K5676W`。线上事件路由仍须部署后在 GA4 验收。
- 首页询盘弹窗补齐原生按钮、dialog 语义、可访问名称、焦点进入/约束/恢复与 Escape 关闭；真实浏览器已验证两类首页表单、统一询盘页、键盘路径、390 px 移动端无横向溢出和无控制台错误。
- 删除或改写无法证明的客户数、产能、经验、价格和运输比较承诺；运输页改为买家可执行的 brief 与 release checklist，不把范围讨论写成已承诺服务。
- 当前本地结果：17 / 17 canonical、错误 0、孤儿页 0、首页最大深度 2；30 项发布前门禁通过，Vercel production 候选构建成功，16 项构建后门禁通过，构建产物 441 个文件。
- 候选版本通过本地 HTTP 对全部 17 URL 的生产检查逻辑；最近成功线上证据（2026-08-20）仍是旧版本，2026-08-21 实时复查受联网限制。GSC、Bing、GA4、AI 引用、排名和有效询盘保持“待验证”。
- 隐私/Cookie/Terms 页面、Consent Mode/CMP 与业务主体所需法律文本尚未得到业务/法律输入，不自行补写或宣称合规；Core Web Vitals 也需具备 Chrome DevTools 性能测量能力后再建立基线。
- 当前任务已配置为每天 09:00（Asia/Shanghai）巡检：每天只关闭一个最高价值闭环，只有新 P0/P1、实证指标变化、完成的实质动作或需要人工决定时才提醒。

## 2026-08-20：可访问性与询盘交互门禁

- 共享 SEO 页面按钮改用更深品牌色，白字对比度由约 2.79:1 提升到约 5.48:1；同时增加键盘焦点样式和 `prefers-reduced-motion` 兼容。
- 询盘表单增加可访问名称，提交按钮与隐私说明关联；WhatsApp 新窗口被阻止时回退到当前窗口，避免用户填写后无反馈。
- 审计器逐页检查 html 语言、唯一 main、可用 skip link、有名称的导航、非正数 tabindex、表单标签与按钮名称。
- 这些静态门禁不能替代读屏器与发布后的真实生产验收；2026-08-21 已补充本地真实键盘与 390 px 移动端浏览器测试。

## 2026-08-20：指南署名、日期与 Schema 同步

- 7 个 Article 指南页显示 Glory Star Wear 发布主体、发布日期和更新时间；Schema 使用相同日期和 Organization 实体引用。
- 审计器阻断缺失 Article 核心字段、主实体 URL 与 canonical 不一致、作者/发布者实体漂移，或结构化日期未在页面可见的情况。
- sitemap `lastmod` 只随页面真实修改更新；不得为了制造新鲜度而每日批量改日期。

## 2026-08-19：统一询盘闭环

- 本地新增并纳入发布候选 `/request-a-quote/`，承接 custom activewear quote 与项目简报意图。
- 表单不依赖不存在的后端：在浏览器内完成必填校验，将需求整理为 WhatsApp 消息，由访客检查后发送。
- 各商业页 CTA 携带产品意向进入询盘页并自动预选，保留页面底部的直接 WhatsApp 路径。
- 结构化表单完成记录 `quote_form_complete` 与 `generate_lead`，直接 WhatsApp 记录 `whatsapp_click`，样品站出口记录 `sample_store_click`；发布后需在 GA4 DebugView 与实时报告中人工验收。
- 不声明固定 MOQ、价格、交期或未经验证的能力；报价基于确认后的项目范围。

## 2026-08-19：Gym Wear 主题缺口

- 本地新增并纳入发布候选 `/gym-wear-manufacturer/`，独立承接 gym wear manufacturer 与 custom fitness clothing 意图，避免首页承担过多品类深度。
- 页面围绕训练用途、版型、面料、结构、品牌与样品验收组织内容，不编造 MOQ、交期、认证或产能数字。
- 从首页 workout shorts、Private Label 与 Activewear Sets 建立上下文内链；询盘页支持 `gym-wear` 来源预选。
- 发布后检查 GSC 的页面发现、canonical 选择与具体查询，数据不足前不扩写同义页面。

## 2026-08-19：MOQ 与打样采购指南

- 本地新增并纳入发布候选 `/activewear-moq-sampling/`，承接 activewear MOQ、activewear sample order 与采购验证意图。
- 明确 MOQ 受款式路线、面料、颜色、尺码、品牌工艺、包装及数量拆分影响，不发布未经业务确认的固定数字。
- 将样品问题拆分为款式、品牌、版型、修订与批准参考五类，帮助买家形成可回答的项目问题。
- 从制造流程页和询盘页建立上下文内链，并连接面料、质控与统一项目 brief。
- 上线后以 GSC 查询数据判断该页是否承接 MOQ 意图；若与流程页内耗，优先调整边界而非复制内容。

## 2026-08-19：内部链接图与点击深度守门

- 扩展 `scripts/seo-audit.mjs`：扫描所有静态 HTML 的站内链接，建立页面级有向链接图。
- 新增孤儿页错误：除首页外，任何没有其他 HTML 页面指向的页面都不能通过审计。
- 新增首页可达性与点击深度错误：页面必须能从首页到达，且最大深度不得超过三次点击。
- 当前实测 17 个规范页面全部可达、无孤儿页，首页最大点击深度为 2。
- sitemap 只用于帮助发现，不能替代页面正文、导航或页脚中的语义内链；以后每次新增页面都执行该检查。

## 2026-08-19：品牌定制采购指南

- 本地新增并纳入发布候选 `/activewear-branding-guide/`，承接 custom activewear logo、private label clothing labels 与 activewear packaging 决策意图。
- 仅采用站内已有证据：买家应提供高分辨率 PNG 或 AI Logo 文件，并确认位置、标签与包装；未验证的具体工艺不写成现有能力。
- 页面把品牌定制拆成 artwork、placement、labels、packaging 与 approval record，增强可摘取的直接答案和买家执行清单。
- 从 Private Label 与制造流程页建立语义内链，询盘页增加 branding 意向自动预选。
- 法规类标签要求仅提示买家按目标市场向合格顾问确认，不提供未经核实的法律结论。

## 2026-08-19：制造知识主题中心

- 本地新增并纳入发布候选 `/activewear-manufacturing-guides/`，作为流程、MOQ/打样、面料、品牌定制、质控和产品规格页面的主题中心。
- 页面定位为 CollectionPage，并用 ItemList 显式描述五个核心采购指南的关系；不与具体子页争夺同一主关键词。
- 从首页建立一级入口，子指南回链知识中心；买家可按 Define → Specify → Validate → Control 的路径浏览。
- 汇总三个高频直接答案，并确保 FAQ Schema 与页面可见内容一致，增强搜索引擎与 AI 系统的可解析性。
- 当前所有页面仍需通过零孤儿页、首页可达和最多三次点击的链接图门禁。

## 2026-08-19：运动服运输采购指南

- 本地新增并纳入发布候选 `/activewear-shipping-guide/`，承接 activewear shipping brief、sportswear shipping release 与 activewear freight planning 意图。
- 仅使用已验证声明：可讨论快递、空运、铁路和海运；不承诺固定时效、费用、可用路线或清关结果。
- 页面用 destination、shipment scope、timeline、budget、handoff、documents 与 release authority 组织可比较的运输 brief。
- 接入制造流程、知识中心、质控与统一询盘页，并增加 shipping 意向预选。
- 上线后需用真实目的地和货件信息验收询盘质量；涉及贸易条款、文件或进口要求时由业务与专业方确认。

## 2026-08-19：转化事件治理

- 当前事件分类：直接 WhatsApp 入口为 `whatsapp_click`；只有完成结构化询盘表单才同时记录 `quote_form_complete` 与 `generate_lead`；样品站出口为 `sample_store_click`。
- 统一采集 `method`、`link_url`、`link_text` 与 `page_path`；询盘表单额外采集 `form_name` 与非个人身份的 `product_interest`。
- 不把姓名、邮箱、电话、公司或自由文本需求发送到 GA4，避免将个人信息写入分析事件。
- 扩展审计器：任何直接 WhatsApp 链接缺少 `whatsapp_click`、完成表单缺少双事件、或样品站链接缺少 `sample_store_click`，均作为错误阻断发布。
- 发布后必须在 GA4 DebugView 分别验证首页 WhatsApp、内容页 WhatsApp、统一询盘表单与样品站四条路径；本地静态检查不能代替线上事件验收。

## 2026-08-19：增长记分卡与证据口径

- 新增 `SEO_GROWTH_SCORECARD.md`，把技术、索引、自然可见度、AEO、转化和业务质量统一到可复核口径。
- 当前本地证据基线已更新为：17 个规范页面、审计错误 0、孤儿页 0、首页最大深度 2、canonical sitemap 覆盖 17/17。
- 未部署、未连接或尚未采集的线上指标统一标为“待验证”，禁止用 0 或主观估计填充。
- 周报只选技术/索引、排名/AEO、转化三个目标；月报按 URL 判断保持、更新、合并或延后。
- 明确 `whatsapp_click`、`quote_form_complete`、`generate_lead` 与 `sample_store_click` 都只是行为信号，不等同消息发送、样品订单或有效 B2B 询盘。

## 2026-08-19：结构化数据一致性门禁

- 扩展 `scripts/seo-audit.mjs`，逐页校验 canonical 是否与文件路由一致、`og:url` 是否唯一且等于 canonical。
- 强制每页具有 `index,follow` robots 指令和 Organization；除首页外必须具有 BreadcrumbList，最后一项必须等于 canonical。
- 对 FAQPage 的每个问题检查页面是否存在可见的同义问题标题；允许删除上下文限定词后的高覆盖等价表达，但拒绝完全不可见的问题。
- 初次运行识别到部分 Schema 问题比可见 summary 多出产品上下文词，经语义覆盖核验后均能对应页面可见问题，没有隐藏 FAQ。
- 当前 17 页全部通过 canonical、Open Graph、robots、组织实体、面包屑和 FAQ 可见性门禁。

## 2026-08-19：旧字体资源告警收敛

- 核对 WooCommerce/Astra 缓存 CSS 中 4 个缺失 `.eot` 引用，确认对应 `star` 与 `WooCommerce` 的 WOFF、TTF 和 SVG 字体文件存在。
- 不创建伪 EOT 文件，也不直接忽略所有 EOT；审计器只在同路径现代后备字体实际存在时登记兼容豁免。
- 如果 EOT 缺失且没有 WOFF、TTF 或 SVG 后备，仍作为 `missing-css-assets` 错误阻断发布。
- 审计摘要持续输出 `legacy font fallbacks` 数量，使全绿结果保留可解释证据。

## 2026-08-19：发布候选检查与 404 恢复路径

- 新增 `scripts/predeploy-check.mjs`，用一个命令串联 SEO 审计、JavaScript 语法、sitemap XML、diff whitespace、Vercel 配置与抓取配置检查。
- 验证 `www` 首页及任意路径永久重定向到主域，并检查安全头、静态资源不可变缓存、robots sitemap 和环境文件未被 Git 跟踪。
- 扫描所有 HTML，阻断旧源域 `sparkgymwear.com`、localhost/127.0.0.1 与 `www` canonical 泄漏。
- 新增品牌化 `404.html`，使用 `noindex,follow`、不设置 canonical、不进入 sitemap，并提供首页、Buyer Guides 与询盘恢复路径。
- 当时发布候选通过 15 项本地检查；这仍不等于生产环境部署或线上验收完成。

## 2026-08-19：Vercel 生产构建验证

- 使用已链接的 `glorystarwearing` Vercel 项目执行本地构建，确认平台生成 308 `www → 主域` 路由、安全头、静态资源缓存和自定义 404 路由。
- 首次构建发现内部 SEO 文档、审计脚本和 `_url_map.json` 会被当作静态文件发布；新增 `.vercelignore` 排除这些非站点资源及环境文件。
- 发布前检查新增 `.vercelignore` 强制规则，防止后续意外公开内部运营资料或构建辅助文件。
- 重新构建后必须确认 sitemap 中全部规范页面、404、robots 和 sitemap 被打包，内部文档、脚本、环境文件与抓取映射未打包。
- 2026-08-19 的第二次构建已通过当时 19 项门禁；截至 2026-08-21，当前契约为 17 个规范页面、30 项发布前门禁与 16 项构建后门禁。

## 2026-08-19：预览发布尝试与本地 HTTP 验收

- 尝试把已验证构建发布到 Vercel Preview，平台返回 `Not authorized`，没有创建预览部署，也没有修改生产环境。
- 当前 CLI 身份 `kevintang0824-9246` 可以读取 `glorystarwearing` 项目，但预览写入权限未得到证明；普通部署授权请求未获批准后不再重试。
- 改用只绑定 `127.0.0.1` 的临时服务器验证构建产物：首页、Private Label、Buyer Guides、Request a Quote、robots、sitemap、404、CSS 和 JS 均返回 200。
- 内容断言通过：询盘页包含 WhatsApp 表单，知识中心包含 CollectionPage，404 包含 `noindex,follow`。
- 本轮浏览器控制接口不可用，未完成视觉与交互浏览器验收；生产发布、真实 HTTP 头、GA4 DebugView 与搜索平台验证仍标为待验证。

## 2026-08-19：AI 可见度固定测试集

- 新增 `SEO_AI_VISIBILITY_TESTS.md`，建立 15 个不含品牌暗示的固定英文买家问题，并映射唯一目标页面。
- 统一记录产品/模型模式、联网状态、地区语言、品牌提及、实体正确性、可点击来源、本站 URL、第三方 URL、不支持声明和证据。
- 使用 L0–L4 分级区分未提及、无链接提及、实体正确提及、一般来源与意图匹配的本站页面引用。
- 月度汇总必须保留分子/分母，不混合不同 AI 产品或模式，不把品牌提及等同引用、排名或询盘。
- 当前尚未完成生产部署和正式 AI 测试，所有结果标为“待验证”，不得记为 L0 或 0。

## 2026-08-19：制造商选择与验厂清单

- 本地新增并纳入发布候选 `/activewear-manufacturer-selection-checklist/`，承接 how to choose an activewear manufacturer、activewear supplier checklist 与供应商比较意图。
- 不制作付费榜单或虚假“十大厂家”；使用同一 brief、同一证据、同一样品问题与同一商业范围比较候选供应商。
- 提供 identity、product fit、specification control、sampling、quality control、commercial scope、shipping 七维评估矩阵和 14 项短名单清单。
- 从 Buyer Guides 与 About 建立语义内链，并连接流程、品牌、质控和统一询盘页。
- AI 固定测试 AEO-01 改为映射该页；发布后以实际查询和引用数据判断是否需要调整标题或内容边界。
