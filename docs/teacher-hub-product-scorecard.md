# Teacher Hub Product Scorecard

## Purpose

This scorecard evaluates the `teacher-hub-v2` experience from four perspectives at once:

- specialist daily workflow
- MTSS / IESP systems alignment
- executive product and UX quality
- school sales / demo readiness

The goal is to identify where the hub is already strong, where it still feels prototype-like, and which feature investments would most improve both real usability and buyer confidence.

## Executive Summary

Current product position:

- The hub now has a credible specialist workflow shape.
- The daily schedule rail and class-detail flow are directionally right.
- The experience is no longer overloaded with setup clutter and redundant panels.
- The product is not yet differentiated enough to feel category-leading.

Biggest remaining gap:

- The interface still behaves more like a cleaned-up dashboard than a living instructional operating system.

Most important next shift:

- Move from static class display to real-time instructional decision support.

## Scorecard

| Dimension | Current Score | Desired Score | Why It Matters |
| --- | ---: | ---: | --- |
| Workflow clarity | 8.0 | 9.5 | Specialists must find the right class and student instantly. |
| Instructional usefulness | 6.5 | 9.0 | The page should tell the teacher what to do next, not just what exists. |
| MTSS / IESP alignment | 7.0 | 9.5 | Schools buy defensible systems, not just pretty interfaces. |
| Visual polish | 7.2 | 9.0 | Premium design increases trust, adoption, and perceived product maturity. |
| Information density quality | 6.0 | 9.0 | High-value information should fit on one screen without feeling cramped. |
| Product differentiation | 5.5 | 9.0 | The system needs stronger “why this over another edtech tool?” value. |
| Sales-demo readiness | 6.5 | 9.5 | Leaders need to see immediate value for teachers and departments. |
| Admin / meeting readiness | 5.8 | 9.0 | The same system should support instruction and school accountability. |

## Current Strengths

### 1. Daily navigation is now understandable

The left rail acts as a stable day navigator. This is strong product behavior for specialists, who often work across multiple classrooms and service models.

### 2. Class detail is more focused

The main page now emphasizes:

- class
- lesson
- students

This is much closer to real instructional use than the earlier multi-panel layout.

### 3. Redundancy has been reduced

Repeated class labels, action strips, helper panels, and duplicate explanations have mostly been removed. This improves trust and makes the interface feel more intentional.

### 4. The product is starting to reflect actual school language

Examples:

- `Math`, `Reading`, `Writing`, `Science / Social Studies`
- `World Language Exempt`
- advisory/community blocks being treated differently from intervention blocks

This matters because bad naming immediately breaks educator trust.

## Current Weaknesses

### 1. The interface still feels too static

The page is cleaner, but it does not yet feel “alive.” It should react to:

- time of day
- service model
- student need urgency
- evidence changes
- meeting/documentation state

### 2. Student cards are still mostly descriptive

They show useful information, but they do not yet work as decision engines.

Right now they answer:

- who the student is
- broad support area
- broad goal

They do not yet strongly answer:

- why this student matters right now
- what move to use first
- what evidence triggered this recommendation
- how this ties to current unit goals and annual IESP goals

### 3. Curriculum-specific intelligence is too generic

`Fundations`, `Illustrative Math`, `Second Step`, `Wayfinder`, `LLI`, and `Bridges` should not all behave like the same lesson card with different text.

Each program needs:

- its own content model
- its own decision support cues
- its own lesson-summary style

### 4. The product is not yet strong enough for a sales “wow”

A school buyer should look at the hub and immediately understand:

- this saves specialist time
- this improves service consistency
- this makes meetings easier
- this connects daily instruction to MTSS and IESP documentation

The hub is getting closer, but it does not yet communicate that in a single glance.

## Important Product Metrics

### Daily Workflow Metrics

| Metric | Current Estimate | Desired |
| --- | ---: | ---: |
| Time to locate current class | 2-4 sec | under 2 sec |
| Time to identify highest-need student | 6-12 sec | under 5 sec |
| Clicks to student profile | 1 | 1 |
| Time to identify lesson target | 4-8 sec | under 3 sec |
| Scroll before seeing first student | low/moderate | minimal |

### Cognitive Load Metrics

| Metric | Current Estimate | Desired |
| --- | ---: | ---: |
| Duplicate labels on class page | moderate | near zero |
| Explanatory filler text | low/moderate | minimal |
| Decorative elements with low value | low | minimal |
| Competing visual hierarchies | moderate | one dominant hierarchy |

### MTSS / IESP Metrics

| Metric | Current Estimate | Desired |
| --- | ---: | ---: |
| Student tier visibility | good | excellent |
| Unit-goal visibility | partial | explicit |
| Annual IESP goal visibility | missing | explicit |
| Evidence linkage | weak | explicit |
| Push-in / pull-out distinction | partial | explicit and dynamic |

### Demo / Sales Metrics

| Metric | Current Estimate | Desired |
| --- | ---: | ---: |
| “I understand this product in one screen” | moderate | high |
| “This is better than a generic SIS/LMS” | moderate | very high |
| “This is built for specialists” | high | very high |
| “This supports instruction and accountability” | moderate | very high |

## Highest-Value Feature Opportunities

### Priority 1: Goal stack for each student

Add a structured goal section to every student card:

- current class support area
- current unit goal
- annual IESP goal
- latest evidence source
- recommended move now

Why this matters:

- Makes the hub defensible in meetings
- Makes support actionable during instruction
- Differentiates the product from generic dashboards

Sales value: Very high
Implementation complexity: Medium

### Priority 2: Service-model-aware layouts

The page should behave differently for:

- push-in blocks
- pull-out intervention blocks
- advisory/community blocks
- after-school mode

Why this matters:

- Reflects real specialist practice
- Prevents one-size-fits-all UI
- Makes the system feel intelligent

Sales value: High
Implementation complexity: Medium

### Priority 3: Curriculum-specific lesson templates

Build separate page logic for:

- Fundations
- Illustrative Math
- Bridges
- LLI
- Second Step
- Wayfinder

Why this matters:

- Buyers want to see the system understands their actual programs
- Improves instructional specificity
- Makes the interface feel less generic

Sales value: Very high
Implementation complexity: Medium/High

### Priority 4: Evidence-linked student recommendations

Every “best support now” line should show a light evidence source, for example:

- IM checkpoint
- Bridges unit check
- IKAN
- running record
- Fundations check-up
- student work sample

Why this matters:

- Increases trust
- Supports professional judgment
- Helps in parent and team meetings

Sales value: Very high
Implementation complexity: Medium

### Priority 5: Time-aware operating states

The hub should change based on time:

- current block highlighted
- next block previewed
- after-school mode shown automatically

After-school mode could emphasize:

- unfinished notes
- missing evidence capture
- tomorrow’s prep
- meeting flags

Sales value: High
Implementation complexity: Low/Medium

### Priority 6: Premium density and hierarchy

Continue reducing card bulk while increasing value density:

- more of the class should fit in one screen
- less white space should be “dead”
- typography should distinguish curriculum, lesson number, and support details more clearly

Sales value: Medium/High
Implementation complexity: Medium

## Product Roadmap

### Phase 1: Instructional Intelligence

Goal:

- Make the page tell the specialist what matters right now

Build:

- current unit goal
- annual IESP goal
- evidence source
- best move now
- priority flag for each student

### Phase 2: Program-Aware Experience

Goal:

- Make each curriculum feel native to the system

Build:

- Fundations template
- Illustrative Math template
- Bridges template
- LLI template
- Second Step template
- Wayfinder template

### Phase 3: Systems and Meeting Readiness

Goal:

- Make the hub useful in planning, service delivery, and documentation

Build:

- after-school mode
- meeting prep mode
- missing-documentation flags
- progress-monitoring rollups

### Phase 4: Premium Product Finish

Goal:

- Make the system visually distinctive and emotionally memorable

Build:

- stronger brand system
- refined motion and transitions
- richer state styling
- more intentional empty states
- more confident visual storytelling in demos

## Recommended Next Build Order

1. Add `Current unit goal` and `Annual IESP goal` to student cards
2. Add lightweight evidence labels for recommendations
3. Create a true Fundations lesson template
4. Create an Illustrative Math lesson template
5. Add automatic after-school workspace state
6. Strengthen current/next block behavior in the left rail

## Demo Narrative Recommendation

If this were shown to a school today, the strongest story would be:

- specialists see their day at a glance
- open the current class instantly
- know which students need what support in that class
- connect support decisions to goals and evidence
- move directly into profiles, reports, and planning

The future “wow” story should be:

- the system knows the curriculum
- the system knows the service model
- the system knows the goals
- the system helps the specialist act in real time

## Final Product Judgment

The hub is now a strong foundation.

It is no longer a cluttered prototype.

It is not yet a best-in-class specialist product.

To become that, it needs:

- deeper goal and evidence intelligence
- program-specific lesson models
- stronger service-model awareness
- more alive time-based behavior
- more sales-grade visual distinctiveness
