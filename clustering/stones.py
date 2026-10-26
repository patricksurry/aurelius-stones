#!/usr/bin/env python3
"""
Stones: thematic groupings of the 488 passages of the Meditations.

Every passage was read and given a short theme tag (tags.tsv). This file maps
tags to stones, applies per-passage corrections, and writes stones.json, which
build_data.py consumes. See PROCESS.md for how the grouping was made.

Stones are arranged under the three disciplines Marcus names himself
(VIII.7, XI.37) and which Pierre Hadot uses to organise the work in
The Inner Citadel: judgment (assent), acceptance (desire), action (impulse).
"""

import json
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))

# (id, discipline, maxim) in display order. Maxims are 12 words or fewer and
# summarise the whole stone rather than quoting any one passage.
STONES = [
    # ---- Judgment: how you see ----
    ("cast-out-judgment", "Judgment", "Cast out the judgment “I am harmed,” and the harm is gone."),
    ("things-outside-door", "Judgment", "Things stand outside the door; only your judgment lets them in."),
    ("strip-it-bare", "Judgment", "See each thing bare: its stuff, its cause, how long it lasts."),
    ("guard-the-mind", "Judgment", "Your mind takes the colour of its thoughts; choose them well."),
    ("retreat-within", "Judgment", "No retreat is quieter than your own mind; go there often."),
    ("spring-within", "Judgment", "Within you is a spring of good; keep digging and it flows."),
    ("mind-not-flesh", "Judgment", "You are a mind, not the puppet of flesh and breath."),
    ("pain", "Judgment", "Pain is bearable or brief; don't let imagination add to it."),
    ("only-virtue-good", "Judgment", "Only character is truly good; wealth, fame and pleasure are not."),
    ("whose-praise", "Judgment", "Before you crave their praise, look closely at the minds behind it."),
    # ---- Acceptance: what you want ----
    ("woven-for-you", "Acceptance", "Whatever happens was woven for you, and serves the whole."),
    ("love-your-lot", "Acceptance", "Love what falls to your lot; want what actually comes."),
    ("providence-or-atoms", "Acceptance", "Providence or atoms: either way, you need not be troubled."),
    ("headland", "Acceptance", "Be the headland: the waves break, and you stand."),
    ("one-living-being", "Acceptance", "The universe is one living being; everything in it is kin."),
    ("change", "Acceptance", "Nature loves change above all; why should you fear it?"),
    ("nothing-lost", "Acceptance", "Nothing is lost, only remade into something else."),
    ("river", "Acceptance", "Time is a river; all you see is already passing."),
    ("nothing-new", "Acceptance", "There is nothing new: the same play, with different actors."),
    ("view-from-above", "Acceptance", "Look down from above: how small and brief it all is."),
    ("fame", "Acceptance", "Fame is an echo among people who will soon be forgotten too."),
    ("great-men-died", "Acceptance", "Alexander and his stable boy came to the same end."),
    ("death-natural", "Acceptance", "Death is natural as birth; fall like a ripe olive, grateful."),
    ("death-either-way", "Acceptance", "Scattered or changed, death holds nothing to fear."),
    ("whole-play", "Acceptance", "Three acts can be the whole play; length is not what matters."),
    ("present", "Acceptance", "You only ever live, and only ever lose, this present moment."),
    ("time-short", "Acceptance", "Time is short; stop putting off the life you mean to live."),
    # ---- Action: what you do ----
    ("debts", "Action", "Remember those who formed you, and what each of them gave."),
    ("teachers", "Action", "Learn from good teachers: plainness, patience, steadiness without show."),
    ("sages", "Action", "Keep the wise in view, and judge them by their souls."),
    ("purple", "Action", "Live well even in a palace; don't be dyed in the purple."),
    ("dawn", "Action", "When you'd rather stay in bed, rise to do a human's work."),
    ("use-reason", "Action", "You have reason. Why not use it?"),
    ("in-your-power", "Action", "No one can stop you being honest, kind and free."),
    ("be-good-now", "Action", "Stop arguing about what a good person is. Be one."),
    ("upright", "Action", "Stand upright by yourself; don't be held upright."),
    ("principles-at-hand", "Action", "Keep your principles at hand, and return to them when you slip."),
    ("open-to-correction", "Action", "Listen closely, accept help, and be glad to be corrected."),
    ("necessary", "Action", "Ask of every act and thought: is this necessary?"),
    ("own-business", "Action", "Tend your own mind; don't waste life guessing at others'."),
    ("obstacle-way", "Action", "What stands in the way becomes the way."),
    ("made-for-one-another", "Action", "We were made for one another, like hands and feet."),
    ("common-good", "Action", "Aim every act at the common good; that is your work."),
    ("vine", "Action", "Do good as a vine bears grapes, then move on."),
    ("love-stumblers", "Action", "Love people even when they stumble; they are your kin."),
    ("they-know-not", "Action", "Expect people to do wrong; they act from ignorance, as you have."),
    ("teach-or-bear", "Action", "If they go wrong, teach them kindly, or bear with them."),
    ("leave-the-wrong", "Action", "Another's wrong belongs to them; leave it where it is."),
]

# Theme tag (from tags.tsv) -> stone id
TAG_TO_STONE = {}


def put(stone, *tags):
    for t in tags:
        assert t not in TAG_TO_STONE, t
        TAG_TO_STONE[t] = stone


# Judgment
put("cast-out-judgment", "judgment-makes-harm", "all-is-judgment", "judgment-faculty", "judge-wisely", "opinions-are-bogies")
put("things-outside-door", "things-dont-come-to-you", "first-impressions-only", "indifferent-to-indifferents", "only-will-good-evil", "ruling-self-untroubled")
put("strip-it-bare", "analyze-impressions", "strip-to-naked-facts", "analyze-into-parts", "see-intrinsic-worth", "security-of-life")
put("guard-the-mind", "wipe-impressions", "dismiss-impressions", "discipline-checklist", "not-a-puppet", "mind-dyed-by-thoughts", "four-moods-to-guard", "what-is-my-soul-now", "how-is-ruling-self-employed", "mind-shapes-itself", "scowl-against-nature", "passion-is-fugitive")
put("retreat-within", "inner-retreat", "inner-citadel", "sphere-unhindered", "separate-the-mind", "return-to-self-quickly", "no-robber-of-will", "quotes-fear", "quotes-modesty")
put("spring-within", "delve-within", "ever-flowing-fountain", "lamp-shining-to-end", "mind-like-sunlight", "mind-direct-path", "breathe-the-universal-mind")
put("mind-not-flesh", "ruling-self-vs-body", "ruling-self-reverence", "mind-keep-its-station", "content-with-ruling-self", "rational-soul-properties")
put("pain", "pain-bearable", "pain-not-evil", "philosophy-in-illness", "endure-without-lament", "spirit-not-surrender", "no-self-torment")
put("only-virtue-good", "real-vs-apparent-goods", "pleasure-not-good", "self-control-vs-pleasure", "passions-pleasure-anger", "worth-of-what-you-love", "good-fortune-is-character", "indifferents-death-gods", "own-action-good", "proper-joy-of-man", "action-not-feeling", "quotes-misc")
put("whose-praise", "whose-praise-you-seek", "others-ruling-petty", "value-own-judgment", "ignore-blame-own-path", "flattery-and-contempt", "see-souls-stripped", "judge-the-soul-not-fame")
# Acceptance
put("woven-for-you", "fate-thread", "providence-prescriptions", "providence-justice", "providence-whole-accept", "nature-brings-benefit", "whole-advantage", "nature-and-justice")
put("love-your-lot", "amor-fati-cosmos", "love-your-lot", "give-and-take-back", "liberty-to-accept", "willing-obedience", "accept-relinquish", "simplify-accept", "gratitude-for-what-you-have", "healthy-mind-ready-for-all")
put("providence-or-atoms", "providence-or-atoms", "gods-exist", "gods-justice-afterlife", "turn-prayers-around", "simple-prayer", "trust-the-steward", "three-options-courage")
put("headland", "nothing-unbearable", "headland-misfortune", "cucumber-step-aside", "stop-complaining", "no-complaining-palace", "wrestling-not-dancing", "indifferents-help-without-grief", "reality-veiled-consolation")
put("one-living-being", "cosmos-one-living-being", "one-mind-shared", "kin-attract-kin", "part-of-whole", "heraclitus-awake", "hidden-power-of-nature", "nature-grace-byproducts")
put("change", "change-recycling", "change-necessary", "nature-designs-endings")
put("river", "river-of-time", "leaves-in-the-wind", "smoke-and-nothingness", "transience-vanity-wait", "vanity-of-life")
put("nothing-new", "everything-familiar", "history-repeats", "nothing-surprising", "fig-in-winter", "tragedy-teaches")
put("view-from-above", "view-from-above", "smallness-in-whole", "look-at-the-stars", "live-as-on-a-height", "know-the-whole")
put("fame", "fame-vain", "forgetting-all", "beauty-needs-no-praise")
put("great-men-died", "great-men-died", "equal-in-death", "mourning-futile")
put("death-natural", "death-natural", "transience-death-natural", "little-deaths", "kiss-your-child", "nature-path-to-death", "departing-gently", "free-to-depart")
put("death-either-way", "death-alternatives", "disdain-death", "ready-for-death", "death-and-brevity")
put("whole-play", "length-of-life-irrelevant", "three-acts-whole-play", "death-in-due-season")
put("present", "present-only", "leave-past-direct-present", "future-same-reason", "present-work-rightly")
put("time-short", "time-running-out", "each-day-as-last", "each-act-as-last", "live-as-if-dead-already", "death-and-each-act", "will-I-repent")
# Action
put("debts", "exemplars", "exemplars-father", "gratitude-gods")
put("sages", "socrates-duty-over-death", "socrates-anecdote", "philosophers-over-conquerors", "remember-exemplars", "conquerors-as-bandits", "vanity-of-rulers", "vice-portrait")
put("dawn", "dawn-human-work", "purpose-of-being", "love-your-craft", "labour-without-pity", "art-of-being-good", "your-station-for-philosophy")
put("use-reason", "use-reason", "reason-bears-fruit", "natures-hierarchy", "ends-of-human-nature", "follow-reason-god", "simplicity-follow-god")
put("in-your-power", "virtues-in-your-power", "within-reach", "no-one-can-hinder", "nothing-to-fear-in-right-action", "good-flow-right-action", "three-disciplines", "reason-sets-standard", "virtue-path")
put("be-good-now", "be-good-regardless", "be-good-now", "be-good-today", "be-good-man-now", "keep-your-titles", "will-you-one-day", "good-life-test", "better-character-not-skill")
put("upright", "inner-divinity-integrity", "upright-not-held", "composed-body", "transparent-simplicity", "speak-plainly", "right-and-true")
put("principles-at-hand", "return-to-philosophy", "rekindle-principles", "return-to-principles", "doctrines-ready", "boxer-not-gladiator", "practise-what-you-despair-of", "philosophy-late-start", "philosophy-practice", "three-thoughts-ready", "forgotten-truths-list", "review-your-life", "wake-from-dreams", "sanity-is-the-prize", "pupil-before-master")
put("open-to-correction", "open-to-correction", "listen-attentively", "ask-for-help")
put("necessary", "do-few-necessary", "aim-not-distraction", "soul-violence-aim", "short-road-nature", "do-own-duty", "duty-methodically", "duty-indifferent-to-conditions", "small-step-not-utopia", "see-what-to-do", "knowledge-in-action")
put("own-business", "attend-own-soul", "ask-to-what-end")
put("obstacle-way", "obstacle-as-fuel", "reservation-action", "reason-moves-through-obstacles", "present-is-material")
put("made-for-one-another", "cosmic-city", "fellow-workers-whole", "cosmos-social-order", "branch-cut-off", "rejoin-the-whole", "harm-to-city-test", "injustice-is-impiety", "omission-injustice")
put("common-good", "every-act-social", "one-social-aim", "act-to-act-fellowship", "purposeful-action", "neighbourly-act-own-benefit", "calm-and-justice", "justice-and-acceptance", "act-for-men-accept-from-gods", "three-relations", "use-things-men-gods")
put("vine", "good-without-notice", "do-good-be-reviled", "unrecognized-goodness", "quotes-joy")
put("love-stumblers", "difficult-people-kinship", "love-those-who-stumble", "member-not-part", "not-hate-the-inhuman", "cheer-virtues-of-others", "kind-eyes-joy", "sparring-partner", "love-your-lot-people", "enter-others-minds")
put("they-know-not", "expect-wrongdoing", "others-act-by-nature", "understand-offender", "own-similar-faults", "involuntary-wrong-gentleness", "no-one-to-blame", "misjudgment-like-illness", "others-will-act-anyway")
put("teach-or-bear", "instruct-not-anger", "instruct-or-bear", "no-fault-finding", "nine-remedies-for-anger", "firm-and-gentle", "kind-to-those-who-despise", "dont-give-up-on-people")
put("leave-the-wrong", "others-wrong-their-business", "evil-harms-only-doer", "others-will-indifferent", "not-like-enemy", "flee-own-wickedness", "others-moods-your-material", "flee-corruption", "quotes-anger-futile")

# Per-passage corrections where a shared tag needed splitting, or where the
# embedding cross-check prompted a re-read (see PROCESS.md)
OVERRIDE = {
    # Things themselves can't reach the mind (vs. actively casting out a judgment)
    "V.19": "things-outside-door", "IX.15": "things-outside-door", "VII.14": "things-outside-door",
    "IV.8": "things-outside-door", "VI.52": "things-outside-door",
    # Elemental recycling: nothing is lost, only remade
    "IV.21": "nothing-lost", "V.13": "nothing-lost", "VII.23": "nothing-lost", "VIII.18": "nothing-lost",
    "VIII.6": "nothing-lost", "X.7": "nothing-lost", "XI.35": "nothing-lost", "VI.4": "nothing-lost", "IV.42": "nothing-lost",
    # Book I: family and the gods vs. teachers (Antoninus included)
    **{f"I.{n}": "teachers" for n in range(6, 17)}, "VI.30": "teachers",
    # An ending is no harm (ball, bubble, thrown stone)
    "VIII.20": "whole-play", "IX.17": "whole-play",
    "VIII.41": "obstacle-way",
    "VII.67": "in-your-power", "XI.36": "in-your-power",
    "IX.5": "common-good",
    "XI.23": "whose-praise", "XI.32": "whose-praise",
    "VII.66": "sages",
    "VII.38": "headland",
    "VIII.47": "pain",
    "X.25": "love-your-lot",
    "XI.24": "vine",
    "VII.55": "own-business",
    # The palace vs. philosophy ("not dyed in the purple")
    "VIII.3": "purple", "X.10": "purple", "X.19": "purple", "IV.28": "purple", "VI.34": "purple",
    "VIII.9": "purple", "VI.12": "purple", "XI.7": "purple", "XI.25": "purple",
}


def ref_key(ref):
    roman = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12}
    book, section = ref.split(".")
    return roman[book], int(section)


def main():
    tags = dict(line.rstrip("\n").split("\t") for line in open(os.path.join(HERE, "tags.tsv"), encoding="utf-8"))
    assign = {ref: OVERRIDE.get(ref, TAG_TO_STONE[tag]) for ref, tag in tags.items()}

    ids = [s[0] for s in STONES]
    unknown = set(assign.values()) - set(ids)
    empty = set(ids) - set(assign.values())
    assert not unknown and not empty, (unknown, empty)

    out = []
    for sid, discipline, maxim in STONES:
        assert len(maxim.split()) <= 12, maxim
        refs = sorted((r for r, s in assign.items() if s == sid), key=ref_key)
        out.append({"id": sid, "discipline": discipline, "maxim": maxim, "verseIds": refs})

    with open(os.path.join(HERE, "stones.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    sizes = Counter(assign.values())
    print(f"{len(out)} stones, {len(assign)} passages; sizes {min(sizes.values())}–{max(sizes.values())}")


if __name__ == "__main__":
    main()
