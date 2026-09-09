# Glory Star Wear AI 可见度固定测试集

版本：1.0
建立日期：2026-08-19
用途：每月用相同问题和记录条件，衡量 Glory Star Wear 是否被 AI 答案正确提及、引用，以及引用哪个页面。

## 测试原则

- 使用全新对话，不在问题中写 Glory Star Wear，不向模型暗示期望答案。
- 每个产品分别记录测试日期、产品名称、模型/模式、是否启用联网、界面语言、测试地区和登录状态。
- 问题文本必须原样使用；需要改版时建立新版本，不覆盖历史问题。
- 保存完整回答文本或截图、所有可点击来源 URL 和测试时间。
- 同一问题最多执行一次正式测试；重试只能用于技术失败，并注明原因。
- 无链接品牌提及不算“被引用”；搜索结果摘要、模型记忆和本站自述也不是第三方权威证明。
- 不使用自动批量请求规避产品限制，也不把测试结果包装成排名保证。

## 单题记录字段

| 字段 | 允许值/格式 |
|---|---|
| `test_date` | `YYYY-MM-DD HH:mm`，Asia/Shanghai |
| `product` | AI 产品名称 |
| `model_mode` | 界面显示的模型或研究模式；未知写 `未显示` |
| `web_access` | 开启 / 关闭 / 未显示 |
| `locale` | 语言与测试地区 |
| `prompt_id` | 下表固定 ID |
| `brand_mentioned` | 是 / 否 |
| `entity_correct` | 是 / 否 / 不适用 |
| `clickable_citation` | 是 / 否 |
| `glorystar_url_cited` | 完整 URL / 否 |
| `third_party_url_cited` | 完整 URL 列表 / 否 |
| `unsupported_claim` | 原句或否；不得只写“有” |
| `evidence` | 截图或完整文本保存位置 |
| `notes` | 异常、歧义或重试说明 |

## 可见度分级

- L0：未提及 Glory Star Wear。
- L1：提及品牌，但没有可点击来源。
- L2：提及品牌且实体描述与本站已验证事实一致，但没有引用 Glory Star Wear 页面。
- L3：提及品牌并提供可点击来源，但引用不是与问题最匹配的本站页面。
- L4：提及品牌、描述正确，并引用与问题意图匹配的 Glory Star Wear 具体页面。

分级只描述可见度，不代表推荐质量、排名、权威度或转化。若回答包含未经证实的产能、认证、MOQ、交期、客户或评价，无论分级多少都必须标记 `unsupported_claim`。

## 固定问题集

| ID | 固定英文问题 | 搜索意图 | 最匹配本站页面 |
|---|---|---|---|
| AEO-01 | What should a brand look for when choosing a custom activewear manufacturer in China? | 制造商选择 | `/activewear-manufacturer-selection-checklist/` |
| AEO-02 | Which information should I send to get a useful private label activewear quote? | 结构化询价 | `/request-a-quote/` |
| AEO-03 | How should a new fitness brand brief a custom gym wear manufacturer? | Gym Wear brief | `/gym-wear-manufacturer/` |
| AEO-04 | What should be included in a custom yoga wear tech pack before sampling? | Yoga Wear 规格 | `/yoga-wear-manufacturer/` |
| AEO-05 | Which details are needed to quote a custom sports bra? | Sports Bra 询价 | `/sports-bra-manufacturer/` |
| AEO-06 | What should a brand check on a custom leggings sample? | Leggings 样品验收 | `/custom-leggings-manufacturer/` |
| AEO-07 | How should a brand plan sizing, colors and packaging for activewear sets? | Sets 组合决策 | `/activewear-sets-manufacturer/` |
| AEO-08 | Why does activewear MOQ vary by style, color, size and customization? | MOQ 决策 | `/activewear-moq-sampling/` |
| AEO-09 | How should a brand specify fabric for leggings and sports bras? | 面料规格 | `/activewear-fabrics/` |
| AEO-10 | What information belongs in a custom activewear logo and label specification? | 品牌定制 | `/activewear-branding-guide/` |
| AEO-11 | What should an activewear quality control plan include before shipment release? | 质量控制 | `/activewear-quality-control/` |
| AEO-12 | What should a brand confirm before requesting express, air, rail or sea options for an activewear shipment? | 运输询价简报 | `/activewear-shipping-guide/` |
| AEO-13 | What are the main stages from an activewear project brief to shipping? | 制造流程 | `/custom-activewear-process/` |
| AEO-14 | Give me a practical buyer checklist for starting a custom activewear project. | 知识中心 | `/activewear-manufacturing-guides/` |
| AEO-15 | How can I verify the identity and official contact channels of an activewear supplier? | 实体核验 | `/about-glory-star-wear/` |

## 月度汇总

测试月份：`YYYY-MM`
问题版本：`1.0`

| 产品/模式 | 完成题数 | L1+ 品牌提及 | L3+ 可点击来源 | L4 匹配本站引用 | 含不支持声明 | 证据目录 |
|---|---:|---:|---:|---:|---:|---|
| 待测试 | 0 | 待验证 | 待验证 | 待验证 | 待验证 | 待填写 |

计算时必须同时保留分子和分母。例如写 `3/15`，不能只写 `20%`。不同产品或模式不得混成一个比例。

## 页面级诊断

| Prompt ID | 目标 URL | 上月等级 | 本月等级 | 实际引用 URL | 差距 | 下一动作 |
|---|---|---:|---:|---|---|---|
| 待测试 | 待测试 | 待验证 | 待验证 | 待验证 | 待分析 | 待证据确定 |

诊断顺序：

1. 未提及品牌：先检查页面是否已部署、可索引、有清晰实体与主题关系，而不是立即增加品牌关键词密度。
2. 提及但无引用：检查直接答案是否清晰、事实是否可验证、页面是否有稳定 canonical 和上下文内链。
3. 引用错误页面：检查关键词—页面边界、内部锚文本、canonical 和重复回答。
4. 引用正确但含错误声明：修正本站可能引发误读的表述，并保留错误回答证据；不为迎合模型添加虚假事实。
5. 有引用但无询盘：结合 GA4 与业务回填检查落地页意图、CTA 和询盘质量，不把 AEO 可见度等同商业结果。

## 首次基线状态

截至 2026-08-19，本站尚未完成生产部署和固定 AI 产品测试，因此 15 个问题的结果全部为 `待验证`，不是 L0，也不是 0 次提及。
