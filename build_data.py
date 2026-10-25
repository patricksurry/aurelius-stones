#!/usr/bin/env python3
"""
Builds the complete Meditations dataset (12 Books, 488 Verses, 48 Stones)
with aligned Koine Greek (Teubner/Perseus) and English (Farquharson),
thematic Stone clustering, affinity rankings, and underside Greek/translation notes.
"""

import html
import json
import math
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

ROMAN = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"
}

BOOK_TITLES = {
    1: ("Debts and Lessons", "Written among the Quadi on the River Gran"),
    2: ("On the River Gran", "Written in Carnuntum"),
    3: ("In Carnuntum", "Reflections on the Danube frontier"),
    4: ("The Inner Citadel", "Meditations on retreat, judgment, and impermanence"),
    5: ("At Dawn", "On duty, obstacles, and human nature"),
    6: ("The Governing Mind", "On cosmic order and equanimity"),
    7: ("The Spring Within", "Maxims and touchstones for resilience"),
    8: ("The Unconquered Fortress", "On clear perception and self-mastery"),
    9: ("In Harmony with Nature", "On justice, forgiveness, and mortality"),
    10: ("Being a Good Man", "On wholeheartedly accepting the whole"),
    11: ("Branches of One Tree", "On community, gentleness, and Socrates' example"),
    12: ("The Final Hour", "Closing distillations on the mind and mortality")
}

# =============================================================================
# 48 STONES COVERING ALL 12 BOOKS OF MEDITATIONS
# =============================================================================
STONES_SPEC = [
    # Book I Stones (1-3)
    {
        "id": "stone-01",
        "pillar": "Gratitude & Exemplars",
        "defaultMaxim": "Remember the living examples of character, simplicity, and steadiness that shaped you.",
        "seedVerses": ["I.1", "I.2", "I.3", "I.4", "I.5", "I.14", "I.17"],
        "keywords": ["grandfather", "mother", "father", "brother", "gods", "simplicity", "temper", "modesty"],
        "greekRoots": ["καλοκαγαθία", "ἀόργητος", "ἁπλότης", "αἰδήμων"]
    },
    {
        "id": "stone-02",
        "pillar": "Gratitude & Exemplars",
        "defaultMaxim": "Seek mentors who teach you to endure frank speech, drop trivialities, and live philosophy rather than display it.",
        "seedVerses": ["I.6", "I.7", "I.8", "I.9", "I.10", "I.11", "I.12", "I.13", "I.15"],
        "keywords": ["rusticus", "apollonius", "sextus", "fronto", "maximus", "epictetus", "philosophy", "rhetoric", "fault"],
        "greekRoots": ["φιλοσοφία", "ἐπανόρθωσις", "εὐνοϊκός", "ἀπαθής"]
    },
    {
        "id": "stone-03",
        "pillar": "Gratitude & Exemplars",
        "defaultMaxim": "Stand firm without theatrical display: gentle, unhurried, thorough in inquiry, and content with little.",
        "seedVerses": ["I.16", "VI.30"],
        "keywords": ["antoninus", "disciple", "emperor", "mildness", "resolution", "vainglory", "flattery", "sober"],
        "greekRoots": ["ἥμερος", "ἀκενόδοξος", "νῆφον", "βέβαιος"]
    },

    # Perception, Assent & The Inner Citadel (4-12)
    {
        "id": "stone-04",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Events cannot touch the soul; drop the sense of injury and the injury itself disappears.",
        "seedVerses": ["IV.7", "II.15", "IV.39", "VIII.40", "IX.13", "XII.22", "XII.25", "XII.26"],
        "keywords": ["opinion", "harmed", "harm", "injury", "hurt", "judgment", "supposition"],
        "greekRoots": ["ὑπόληψις", "βέβλαμμαι", "βλάβη", "κρίμα"]
    },
    {
        "id": "stone-05",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "You do not have to hold an opinion about everything; things have no power to extort your verdict.",
        "seedVerses": ["VI.52", "VIII.47", "V.19", "VI.57", "VII.14", "VII.16", "XI.11", "XI.16"],
        "keywords": ["opinion", "distressed", "external", "estimate", "revoke", "judgments", "disturb", "honey"],
        "greekRoots": ["ὑπολαμβάνειν", "κρίσις", "ἐξαλεῖψαι", "πράγματα"]
    },
    {
        "id": "stone-06",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "Retreat into your own mind; nowhere is quieter or more untroubled than an ordered soul within.",
        "seedVerses": ["IV.3", "IV.11", "IV.12", "III.7", "V.26", "VII.28", "X.23"],
        "keywords": ["retreat", "country", "hills", "peaceful", "quiet", "renew", "withdraw", "within"],
        "greekRoots": ["ἀναχώρησις", "εὐκοσμία", "εὐμάρεια", "ἡσυχία"]
    },
    {
        "id": "stone-07",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "The ruling mind free of passions is an unconquerable fortress; nothing can force its gates unless it opens them.",
        "seedVerses": ["VIII.48", "V.2", "VI.8", "VII.55", "VII.68", "VIII.49", "VIII.51", "VIII.56", "IX.7"],
        "keywords": ["citadel", "fortress", "invincible", "ruling", "governing", "untaken", "refuge", "passions"],
        "greekRoots": ["ἀκρόπολις", "ἡγεμονικόν", "ἀκαταμάχητον", "πάθος"]
    },
    {
        "id": "stone-08",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "Dig inside yourself; within lies the spring of good, ever ready to bubble up if you keep digging.",
        "seedVerses": ["VII.59", "VII.17", "VII.29", "VIII.1", "VIII.43", "X.1", "XII.3", "XII.19"],
        "keywords": ["dig", "spring", "fountain", "within", "inside", "happiness", "good", "divine"],
        "greekRoots": ["σκάπτε", "πηγή", "ἔνδον", "δαίμων"]
    },
    {
        "id": "stone-09",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Your mind becomes dyed the color of its habitual thoughts; steep it in clear and noble impressions.",
        "seedVerses": ["V.16", "III.4", "IV.22", "V.36", "V.37", "VI.3", "VIII.29", "VIII.36"],
        "keywords": ["dyed", "thoughts", "imaginations", "impressions", "colour", "think", "mind", "gaze"],
        "greekRoots": ["βάπτεται", "φαντασία", "διάνοια", "τροπή"]
    },
    {
        "id": "stone-10",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Strip away the dramatic myth from every object and examine it naked: what is it made of, and how long can it last?",
        "seedVerses": ["VI.13", "III.11", "VIII.11", "IX.25", "IX.36", "XI.2", "XII.8", "XII.10", "XII.18"],
        "keywords": ["purple", "falernian", "roast", "corpse", "shellfish", "strip", "naked", "divide", "matter", "cause"],
        "greekRoots": ["γυμνός", "αἴτιον", "ὑλικόν", "ἀναπτύσσειν"]
    },
    {
        "id": "stone-11",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "You are flesh, breath, and a ruling mind; stop letting the mind be pulled about like a puppet by the other two.",
        "seedVerses": ["II.2", "III.16", "V.33", "VI.28", "VI.32", "VII.66", "X.24", "XII.2", "XII.14"],
        "keywords": ["flesh", "breath", "puppet", "strings", "body", "soul", "spirit", "vital"],
        "greekRoots": ["σαρκία", "πνευμάτιον", "νευροσπαστεῖν", "νοῦς"]
    },
    {
        "id": "stone-12",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Wait Before assenting: say to every troubling impression, 'You are only an impression, and not at all what you claim to be.'",
        "seedVerses": ["VII.2", "V.10", "VII.54", "VII.64", "VIII.7", "VIII.13", "VIII.26", "VIII.28", "IX.15"],
        "keywords": ["assent", "impression", "dogmas", "caution", "error", "pain", "appearances", "nature"],
        "greekRoots": ["συγκατάθεσις", "δόγμα", "φαντασία", "φυσιολογία"]
    },

    # Right Action, Duty & Simplicity (13-21)
    {
        "id": "stone-13",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Do less, better: ask at every moment of your words and thoughts, 'Is this among the necessary things?'",
        "seedVerses": ["IV.24", "II.7", "III.14", "IV.20", "IV.32", "VII.27", "VIII.32", "IX.16"],
        "keywords": ["necessary", "tranquillity", "essential", "distract", "simplicity", "actions", "leisure", "wander"],
        "greekRoots": ["ἀναγκαῖα", "εὐθυμία", "ἀπραγμοσύνη", "σχολή"]
    },
    {
        "id": "stone-14",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Perform every act as if it were the last of your life—unhurried, unpretentious, and free of hypocrisy.",
        "seedVerses": ["II.5", "III.5", "III.12", "VI.2", "VII.15", "VII.60", "VII.69", "VIII.5", "VIII.22"],
        "keywords": ["hour", "roman", "seriousness", "last", "act", "upright", "erect", "hypocrisy", "attention"],
        "greekRoots": ["ἀπλάστου", "ἐσχάτην", "ὀρθός", "προσοχή"]
    },
    {
        "id": "stone-15",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Stop arguing about what a good person ought to be. Be one.",
        "seedVerses": ["X.16", "II.4", "III.1", "V.5", "VIII.19", "VIII.24", "X.8", "XI.29", "XII.17"],
        "keywords": ["putting off", "good man", "delay", "opportunity", "talk", "virtue", "true", "right"],
        "greekRoots": ["ἀγαθός", "ἀναβάλλεσθαι", "καθήκει", "ἀληθές"]
    },
    {
        "id": "stone-16",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "At dawn when you are reluctant to rise, tell yourself: 'I am rising to do the work of a human being.'",
        "seedVerses": ["V.1", "V.9", "VI.12", "VIII.12", "IX.40", "X.12", "X.28", "XI.19"],
        "keywords": ["dawn", "rise", "blankets", "sleep", "warm", "work", "plants", "birds", "ants", "bees", "stepmother"],
        "greekRoots": ["ὄρθρος", "καθεύδειν", "ἔργον", "ἀνθρώπου"]
    },
    {
        "id": "stone-17",
        "pillar": "Obstacles & Reserve",
        "defaultMaxim": "The mind converts every obstacle into fuel; the impediment to action advances action, and what blocks the road becomes the road.",
        "seedVerses": ["V.20", "IV.1", "VI.50", "VIII.35", "VIII.41", "X.31", "X.33"],
        "keywords": ["obstacle", "impediment", "fire", "lamp", "adapt", "converts", "way", "road", "hindrance"],
        "greekRoots": ["κώλυμα", "περιτροπή", "ὑπεξαίρεσις", "πῦρ"]
    },
    {
        "id": "stone-18",
        "pillar": "Obstacles & Reserve",
        "defaultMaxim": "Be like the headland against which the waves continually break: it stands firm and tames the fury of the water around it.",
        "seedVerses": ["IV.49", "IV.35", "V.34", "VII.43", "VII.50", "VII.51", "VIII.46", "X.35"],
        "keywords": ["headland", "promontory", "waves", "unhappy", "fortunate", "eye", "green", "endure"],
        "greekRoots": ["ἄκρα", "κύματα", "ἀτυχής", "εὐτυχής"]
    },
    {
        "id": "stone-19",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Do good as a vine bears grapes or a bee makes honey, without calling a crowd to witness and moving straight to the next task.",
        "seedVerses": ["V.6", "IV.31", "VI.7", "VI.16", "VII.73", "VII.74", "IX.29", "XI.4"],
        "keywords": ["vine", "grapes", "horse", "bee", "honey", "debtor", "thanks", "reward", "benefaction"],
        "greekRoots": ["ἄμπελος", "καρπός", "μέλισσα", "εὐεργετεῖν"]
    },
    {
        "id": "stone-20",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "When jarred by circumstances, return to philosophy without shame; even if you miss the mark, come back willingly to the rhythm.",
        "seedVerses": ["VI.11", "V.3", "VI.21", "VI.22", "VII.7", "VII.12", "VIII.9", "X.13", "XII.6"],
        "keywords": ["return", "harmony", "truth", "refuted", "help", "soldier", "scaling", "left hand", "practice"],
        "greekRoots": ["ἐπάνιθι", "ῥυθμός", "βοηθεῖσθαι", "ἀληθείᾳ"]
    },
    {
        "id": "stone-21",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Compose your life action by action; if each single step accomplishes its work as far as possible, be content.",
        "seedVerses": ["VIII.32", "III.6", "III.8", "V.29", "VI.26", "VII.5", "VII.58", "IX.6", "XI.5"],
        "keywords": ["action by action", "step", "present", "hinder", "content", "profession", "art", "sufficient"],
        "greekRoots": ["κατὰ πρᾶξιν", "ἀπαρτίζειν", "τέχνη", "ἀρκεῖ"]
    },

    # Dealing with Fellow Humans, Patience & Community (22-30)
    {
        "id": "stone-22",
        "pillar": "Fellow Humans",
        "defaultMaxim": "Expect difficult people each morning; yet remember you were born for cooperation, like hands, feet, and the rows of teeth.",
        "seedVerses": ["II.1", "II.16", "V.17", "V.28", "VI.39", "VIII.59", "IX.23", "XI.8", "XI.9"],
        "keywords": ["morning", "meddling", "ungrateful", "cooperation", "hands", "feet", "teeth", "branch", "tree"],
        "greekRoots": ["συνεργία", "συγγενής", "κλάδος", "κοινωνικός"]
    },
    {
        "id": "stone-23",
        "pillar": "Fellow Humans",
        "defaultMaxim": "The noblest way of defending yourself is not to become like the wrongdoer.",
        "seedVerses": ["VI.6", "IV.18", "V.25", "VI.27", "VII.26", "VII.62", "VII.63", "VII.70", "IX.4"],
        "keywords": ["avenging", "revenge", "wrongdoer", "assimilate", "cruel", "sins", "himself", "soul"],
        "greekRoots": ["ἀμύνεσθαι", "ἐξομοιοῦσθαι", "ἁμαρτάνειν", "ἄκων"]
    },
    {
        "id": "stone-24",
        "pillar": "Fellow Humans",
        "defaultMaxim": "It is peculiar to humanity to love even those who stumble, remembering they err through ignorance and will soon be gone.",
        "seedVerses": ["VII.22", "II.10", "II.13", "IV.6", "VI.20", "VII.65", "VIII.14", "VIII.17", "IX.11"],
        "keywords": ["love", "stumble", "ignorance", "unwillingly", "kinsmen", "gymnasium", "forgive", "kind", "pity"],
        "greekRoots": ["πταίοντας", "ἄγνοια", "φιλεῖν", "εὐμενής"]
    },
    {
        "id": "stone-25",
        "pillar": "Fellow Humans",
        "defaultMaxim": "Anger is weakness, not strength; gentleness and patience are more human, more manly, and far more invincible.",
        "seedVerses": ["XI.18", "XI.13", "XI.14", "XI.15", "XI.20", "XI.21", "XII.16"],
        "keywords": ["anger", "gentleness", "meekness", "manly", "fig-tree", "infants", "horse", "nine", "ten"],
        "greekRoots": ["πρᾳότης", "ἀνδρικώτερον", "ὀργή", "συκῆ"]
    },
    {
        "id": "stone-26",
        "pillar": "Fellow Humans",
        "defaultMaxim": "What does not benefit the hive does not benefit the bee; your own good is inseparable from the common good.",
        "seedVerses": ["VI.54", "III.11", "IV.4", "IV.29", "V.16", "V.22", "VI.44", "VI.45", "X.6", "XI.21"],
        "keywords": ["hive", "bee", "city", "citizen", "rome", "commonwealth", "world-city", "fellow", "social"],
        "greekRoots": ["σμῆνος", "μέλισσα", "πόλις", "πολίτης"]
    },
    {
        "id": "stone-27",
        "pillar": "Fellow Humans",
        "defaultMaxim": "Stop wondering what is happening inside your neighbor's soul; spend that energy attending to the ruler within your own.",
        "seedVerses": ["II.8", "III.4", "IV.18", "IX.18", "IX.22", "IX.27", "IX.34", "X.4", "X.30", "X.37"],
        "keywords": ["another's", "neighbor", "examine", "teach", "correct", "point out", "blame", "minds"],
        "greekRoots": ["ἀλλότριος", "ψυχή", "δίδασκε", "εὐθύς"]
    },
    {
        "id": "stone-28",
        "pillar": "Fellow Humans",
        "defaultMaxim": "Enter into the governing mind of the speaker, and let others enter frankly into yours.",
        "seedVerses": ["VI.53", "IV.38", "VII.4", "VIII.53", "VIII.61", "XI.10", "XI.12", "XI.17", "XI.26"],
        "keywords": ["listen", "speaker", "enter", "attentively", "wise", "prudent", "discourse", "witness"],
        "greekRoots": ["παρακολουθεῖν", "λέγων", "εἴσδυε", "φρόνιμος"]
    },

    # Time, Impermanence & Mortality (31-40)
    {
        "id": "stone-29",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Even if you lived three thousand years, no one ever possesses or loses anything except this present instant.",
        "seedVerses": ["II.14", "II.12", "III.10", "VI.36", "VII.49", "VIII.2", "VIII.44", "XI.1", "XII.7"],
        "keywords": ["three thousand", "present", "moment", "longest", "shortest", "instant", "now", "loses"],
        "greekRoots": ["τρισχίλια", "παρόν", "βραχύτατον", "αἰών"]
    },
    {
        "id": "stone-30",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Time is a rushing river of passing events; no sooner does a thing appear than it is swept past and another takes its place.",
        "seedVerses": ["IV.43", "II.17", "IV.36", "V.23", "VI.15", "VII.19", "IX.19", "IX.28", "X.17"],
        "keywords": ["river", "stream", "torrent", "flux", "smoke", "swept", "vapor", "warfare", "sojourn"],
        "greekRoots": ["ποταμός", "ῥεῦμα", "ῥοή", "καπνός"]
    },
    {
        "id": "stone-31",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Close at hand is your forgetting of all things, and close at hand is the forgetting of you by all.",
        "seedVerses": ["VII.21", "IV.33", "IV.50", "VI.24", "VIII.21", "VIII.25", "VIII.31", "VIII.37", "IX.30", "X.34"],
        "keywords": ["forgetting", "augustus", "hadrian", "alexander", "mule-driver", "court", "cemetery", "leaves", "epitaph"],
        "greekRoots": ["λήθη", "Ἀλέξανδρος", "ὀρεωκόμος", "φύλλα"]
    },
    {
        "id": "stone-32",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Anything beautiful at all is beautiful of itself and complete in itself; praise neither makes it better nor worse.",
        "seedVerses": ["IV.20", "IV.19", "III.4", "VI.16", "VI.18", "VII.34", "VII.67", "VIII.1", "VIII.52", "IX.18"],
        "keywords": ["beautiful", "emerald", "praise", "fame", "posthumous", "after-fame", "applause", "clapping", "tongues"],
        "greekRoots": ["καλόν", "σμάραγδος", "ἔπαινος", "ὑστεροφημία"]
    },
    {
        "id": "stone-33",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Depart from life serenely, as a ripe olive falls—blessing the earth that bore it and grateful to the tree that gave it growth.",
        "seedVerses": ["IV.48", "II.11", "III.2", "III.3", "IV.5", "IV.14", "IV.15", "IV.47", "IX.3", "XII.36"],
        "keywords": ["olive", "ripe", "actor", "three acts", "five", "depart", "incense", "harbor", "death", "citizen"],
        "greekRoots": ["ἐλαία", "πέπειρος", "ὑποκριτής", "θάνατος"]
    },
    {
        "id": "stone-34",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Look from above upon the countless herds, ceremonies, voyages, and battles: the play is always the same, only the actors change.",
        "seedVerses": ["VII.48", "VI.46", "VII.3", "IX.24", "X.27", "XI.1", "XI.6", "XI.24", "XII.24"],
        "keywords": ["watch-tower", "above", "herds", "pageants", "amphitheatre", "stage", "hadrian", "antoninus", "philip"],
        "greekRoots": ["ἄνωθεν", "ἀγέλαι", "θέατρον", "δρᾶμα"]
    },
    {
        "id": "stone-35",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Nothing is harmed by transformation; the universe delights in changing existing things to bring fresh ones into being.",
        "seedVerses": ["IV.36", "IV.42", "VII.18", "VII.23", "VII.25", "VIII.6", "VIII.18", "VIII.50", "IX.21", "X.7"],
        "keywords": ["change", "transformation", "seed", "elements", "dissolution", "wood", "chest", "carpenter", "wax"],
        "greekRoots": ["μεταβολή", "σπέρμα", "στοιχεῖα", "διάλυσις"]
    },
    {
        "id": "stone-36",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Do not despise death, but welcome it as one of the things Nature wills—like youth and age, blossom and harvest.",
        "seedVerses": ["IX.3", "II.12", "IV.17", "IV.41", "V.4", "VI.2", "VIII.20", "VIII.45", "VIII.58", "IX.10", "X.29", "XII.23"],
        "keywords": ["despise death", "pregnant", "womb", "child", "fear of death", "harvest", "ears of corn", "operation of nature"],
        "greekRoots": ["καταφρόνει", "θανάτου", "κυοφορεῖσθαι", "φύσεως ἔργον"]
    },

    # Nature, Cosmic Order & Equanimity (37-48)
    {
        "id": "stone-37",
        "pillar": "Nature & the Whole",
        "defaultMaxim": "All things are woven together and the bond is sacred; there is one universe, one substance, one law, and one truth.",
        "seedVerses": ["VII.9", "IV.40", "V.8", "VI.38", "VII.32", "IX.9", "X.21", "XII.30"],
        "keywords": ["woven", "interwoven", "sacred", "one universe", "living", "sympathy", "asclepius", "prescribed", "sun"],
        "greekRoots": ["ἐπιπέπλεκται", "κόσμος", "σύνδεσμος", "Ἀσκληπιός"]
    },
    {
        "id": "stone-38",
        "pillar": "Nature & the Whole",
        "defaultMaxim": "Love the little craft you have learned and rest in it; walk through the remainder of life as one who has entrusted everything to the gods.",
        "seedVerses": ["IV.31", "II.3", "II.13", "V.7", "V.27", "VI.10", "VI.40", "IX.1", "IX.12", "X.11"],
        "keywords": ["love the art", "prayer", "athenians", "rain", "zeus", "entrusted", "providence", "atoms", "impiety"],
        "greekRoots": ["τέχνιον", "εὐχή", "Ζεῦ", "πρόνοια"]
    },
    {
        "id": "stone-39",
        "pillar": "Nature & the Whole",
        "defaultMaxim": "Everything that harmonizes with you, O Cosmos, harmonizes with me; nothing is too early or too late for me that is in season for you.",
        "seedVerses": ["IV.23", "III.2", "IV.26", "V.21", "VI.36", "VI.42", "VI.43", "VIII.7", "X.20", "XII.32"],
        "keywords": ["city of cecrops", "city of zeus", "season", "bread", "crust", "figs", "olives", "lion", "boar", "heraclitus"],
        "greekRoots": ["συναρμόζει", "εὔκαρπον", "Κέκροπος", "Διός"]
    },
    {
        "id": "stone-40",
        "pillar": "Nature & the Whole",
        "defaultMaxim": "Even the unintended byproducts of Nature—the cracks in baked bread, the foam on the boar's jaws, the silver in old age—have their own grace.",
        "seedVerses": ["III.2", "VI.17", "VI.37", "VII.47", "VIII.57", "IX.32", "X.2", "XI.22", "XI.23"],
        "keywords": ["loaf", "bread", "cracks", "bakers", "boar", "foam", "stars", "sunbeams", "mouse", "socrates"],
        "greekRoots": ["ἄρτος", "ἐπιγινόμενα", "χάρις", "ἀκτῖνες"]
    },
    {
        "id": "stone-41",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Regarding pain: what is unbearable carries us off quickly, and what lasts long can be borne while the mind preserves its own calm.",
        "seedVerses": ["VII.33", "VII.64", "VIII.28", "VIII.41", "IX.41", "X.3", "XII.1", "XII.4", "XII.9"],
        "keywords": ["pain", "epicurus", "unbearable", "chronic", "endurable", "pancratiast", "boxer", "sword"],
        "greekRoots": ["πόνος", "ἀφόρητον", "Ἐπίκουρος", "παγκρατιαστής"]
    },
    {
        "id": "stone-42",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "Soon you will be ashes or a skeleton; why then let your soul be anything less than simple, good, sincere, and self-reliant?",
        "seedVerses": ["V.33", "III.3", "III.6", "IV.37", "V.11", "V.24", "VI.14", "X.9", "X.15", "XI.3"],
        "keywords": ["ashes", "skeleton", "sincere", "simple", "tragedy", "mimic", "sailors", "Odysseus"],
        "greekRoots": ["σποδός", "σκελετός", "ἁπλοῦς", "αἰδήμων"]
    },
    {
        "id": "stone-43",
        "pillar": "Right Action & Duty",
        "defaultMaxim": "Take without arrogance, let go without a struggle; use external things freely when present, and never crave them when absent.",
        "seedVerses": ["VIII.33", "V.12", "V.15", "VI.31", "VI.41", "VII.27", "VIII.10", "IX.42", "X.18", "XI.25"],
        "keywords": ["arrogance", "struggle", "indifferent", "wealth", "luxury", "awake", "dreams", "diogenes", "socrates"],
        "greekRoots": ["ἀτύφως", "εὐλύτως", "ἀδιάφορα", "πλοῦτος"]
    },
    {
        "id": "stone-44",
        "pillar": "Nature & the Whole",
        "defaultMaxim": "A cucumber is bitter? Throw it down. There are brambles in the path? Step aside. That is enough—do not ask why such things exist in the world.",
        "seedVerses": ["VIII.50", "IV.9", "IV.10", "V.18", "VI.1", "VI.4", "VI.5", "VI.9", "VII.75", "X.5"],
        "keywords": ["cucumber", "bitter", "brambles", "turn aside", "justly", "substance", "governing reason", "happens"],
        "greekRoots": ["σίκυος", "πικρός", "βάτοι", "ἔκκλινον"]
    },
    {
        "id": "stone-45",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "A sphere of light stays round and true to itself, neither stretching outward nor collapsing inward, shining with steady attention.",
        "seedVerses": ["XI.12", "VIII.41", "VIII.54", "VIII.57", "IX.8", "X.32", "XI.27", "XII.3", "XII.15"],
        "keywords": ["sphere", "light", "lamp", "radiance", "atmosphere", "air", "round", "illuminate", "pythagoreans"],
        "greekRoots": ["σφαῖρα", "φῶς", "λύχνος", "αὐγή"]
    },
    {
        "id": "stone-46",
        "pillar": "Time & Impermanence",
        "defaultMaxim": "Remember how tiny a corner of the earth you inhabit, and how brief an instant of infinity is assigned to you.",
        "seedVerses": ["III.10", "IV.3", "IV.16", "IV.21", "V.13", "VI.23", "VI.25", "VI.35", "VI.47", "VI.49", "VI.56", "XII.21"],
        "keywords": ["corner", "earth", "infinity", "abyss", "souls", "air", "ant-hill", "puppies", "quarrelling"],
        "greekRoots": ["γωνίδιον", "ἄπειρον", "χάος", "βραχύ"]
    },
    {
        "id": "stone-47",
        "pillar": "Perception & Judgment",
        "defaultMaxim": "Quotes and touchstones from the ancients: hold fast to the short, elemental truths that wash away sorrow at a single glance.",
        "seedVerses": ["VII.35", "VII.36", "VII.37", "VII.38", "VII.39", "VII.40", "VII.41", "VII.42", "VII.44", "VII.45", "VII.46", "VII.52"],
        "keywords": ["plato", "euripides", "antisthenes", "royal", "ill-spoken", "reap", "chrysippus", "socrates"],
        "greekRoots": ["βασιλικόν", "Πλάτων", "Εὐριπίδης", "Σωκράτης"]
    },
    {
        "id": "stone-48",
        "pillar": "The Inner Citadel",
        "defaultMaxim": "Look at the ruling center within you: is it now the mind of a child, a tyrant, a startled animal—or a calm citizen of the cosmos?",
        "seedVerses": ["V.11", "IV.28", "V.14", "V.30", "V.31", "V.32", "V.35", "VII.53", "IX.39", "X.10", "X.14", "XII.31", "XII.33", "XII.34", "XII.35"],
        "keywords": ["tyrant", "woman", "child", "ox", "wild beast", "putting to use", "spider", "sarmatians", "character"],
        "greekRoots": ["τύραννος", "παιδίον", "θηρίον", "χρῆται"]
    }
]

# Handcrafted + Lexicon-Driven Underside Notes
HANDCRAFTED_NOTES = {
    "II.1": [
        {
            "key": "ii-1-periergos",
            "match": "meddling, ungrateful, insolent",
            "phrase": "“meddling, ungrateful, insolent” (II.1)",
            "greek": "περιέργῳ, ἀχαρίστῳ, ὑβριστῇ (periergō, acharistō, hybristē)",
            "comparisons": "Farquharson: “meddling, ungrateful, insolent” · Hammond: “meddling, ungrateful, aggressive” · Hays: “nosy, ungrateful, arrogant”",
            "note": "Marcus opens Book II by preparing for ordinary human friction—starting with *periergos* (literally “working around the edges,” busybody/nosy)—and immediately grounds his patience in the fact that wrongdoers are *syngenēs* (of the same kin)."
        }
    ],
    "II.5": [
        {
            "key": "ii-5-aplastos",
            "match": "unaffected dignity",
            "phrase": "“unaffected dignity” (II.5)",
            "greek": "ἀπλάστου σεμνότητος (aplastou semnotētos)",
            "comparisons": "Farquharson: “unaffected dignity” · Hammond: “unfeigned gravity” · Hays: “unassuming dignity”",
            "note": "*Aplastos* literally means “un-molded” or “un-plastered”—acting with quiet seriousness without putting on a theatrical mask."
        }
    ],
    "II.14": [
        {
            "key": "ii-14-paron",
            "match": "no one loses any other life than this which he now lives",
            "phrase": "“this which he now lives” (II.14)",
            "greek": "οὐδεὶς ἄλλον ἀποβάλλει βίον ἢ τοῦτον ὃν ζῇ",
            "comparisons": "Farquharson: “this which he now lives” · Hammond: “the life he is living now” · Hays: “the one we’re living in the present”",
            "note": "Because the past is gone and the future is not yet, the longest and shortest lives touch reality only at the razor-edge of the present."
        }
    ],
    "III.2": [
        {
            "key": "iii-2-bread",
            "match": "the loaf splits in places",
            "phrase": "“the loaf splits in places” (III.2)",
            "greek": "ὁ ἄρτος ἐν τῷ ὀπτᾶσθαι παραρρήγνυταί που",
            "comparisons": "Farquharson: “the loaf splits in places” · Hammond: “bread cracks open on the surface” · Hays: “bread that splits open on top in the oven”",
            "note": "One of Marcus’s warmest passages: even the unplanned cracks in baked bread, gaping figs, and silver hair have a natural charm (*epicharis*) to an eye that loves the Whole."
        }
    ],
    "IV.1": [
        {
            "key": "iv-1-pyr",
            "match": "just as a fire lays hold of what falls into it",
            "phrase": "“just as a fire lays hold of what falls into it” (IV.1)",
            "greek": "ὥσπερ πῦρ ὅταν ἐπικρατῇ τῶν ἐμπιπτόντων",
            "comparisons": "Farquharson: “just as a fire lays hold of what falls into it” · Hammond: “as a blazing fire masters whatever is thrown onto it”",
            "note": "A small lamp is extinguished by what is thrown upon it, whereas a strong fire turns that very obstacle into brighter flame."
        }
    ],
    "IV.3": [
        {
            "key": "iv-3-anachoresis",
            "match": "retires more quietly and with more freedom from trouble than into his own soul",
            "phrase": "“retires… into his own soul” (IV.3)",
            "greek": "ἀναχωρεῖ εἰς τὴν ἑαυτοῦ ψυχήν (anachōrei eis tēn heautou psychēn)",
            "comparisons": "Farquharson: “retires… into his own soul” · Hammond: “retreat into his own mind” · Hays: “nowhere more peaceful than your own soul”",
            "note": "Marcus defines inner ease (*eumareia*) at the end of this passage as nothing other than *eukosmia*—a well-ordered mind."
        }
    ],
    "IV.7": [
        {
            "key": "iv-7-hypolepsis",
            "match": "Efface the opinion",
            "phrase": "“Efface the opinion” (IV.7)",
            "greek": "Ἆρον τὴν ὑπόληψιν (Aron tēn hypolēpsin)",
            "comparisons": "Farquharson: “Efface the opinion” · Hammond: “Remove the judgment” · Hays: “Choose not to be harmed”",
            "note": "*Hypolēpsis* is the value-judgment or story you attach to an event. Seven Greek words state the entire Stoic psychology of injury."
        }
    ],
    "IV.19": [
        {
            "key": "iv-19-fame",
            "match": "in a flutter for after-fame",
            "phrase": "“in a flutter for after-fame” (IV.19)",
            "greek": "περὶ τὴν ὑστεροφημίαν ἐπτοημένος (eptoēmenos)",
            "comparisons": "Farquharson: “in a flutter for after-fame” · Hammond: “in a flutter over posthumous fame” · Hays: “excited about fame after death”",
            "note": "*Eptoēmenos* describes the startled fluttering of a bird—Marcus’s signature image for anxious craving after external approval."
        }
    ],
    "IV.20": [
        {
            "key": "iv-20-kalon",
            "match": "Everything which is in any way lovely is lovely of itself",
            "phrase": "“lovely of itself, and terminates in itself” (IV.20)",
            "greek": "Πᾶν τὸ καὶ ὁπωσοῦν καλὸν ἐξ ἑαυτοῦ καλόν ἐστι καὶ καταλῆγον εἰς ἑαυτό",
            "comparisons": "Farquharson: “lovely of itself” · Hammond: “beautiful of itself and complete in itself” · Hays: “beautiful in itself”",
            "note": "An emerald does not lose its color if no one praises it; neither does an honest action require an audience."
        }
    ],
    "IV.24": [
        {
            "key": "iv-24-oliga",
            "match": "Do few things",
            "phrase": "“Do few things… do what is necessary” (IV.24)",
            "greek": "Ὀλίγα πρᾶσσε · τἀναγκαῖα πράσσειν",
            "comparisons": "Farquharson: “Do few things… do what is necessary” · Hammond: “Do little… do what is necessary” · Hays: “Do less… do what’s essential”",
            "note": "Marcus quotes Democritus (“Do few things if you want cheerfulness”), then refines it: do only what is *necessary*, and prune away unnecessary thoughts as well."
        }
    ],
    "IV.43": [
        {
            "key": "iv-43-potamos",
            "match": "Time is a river, the mighty current of created things",
            "phrase": "“Time is a river…” (IV.43)",
            "greek": "Ποταμὸς τίς ἐστι τῶν γινομένων καὶ ῥεῦμα βίαιον ὁ αἰών",
            "comparisons": "Farquharson: “Time is a river, the mighty current of created things” · Hammond: “Time is a river, a violent torrent” · Hays: “Time is a sort of river of passing events”",
            "note": "Echoing Heraclitus while campaigning along the Danube, Marcus uses the torrent of time to dissolve attachment to fleeting status."
        }
    ],
    "IV.49": [
        {
            "key": "iv-49-akra",
            "match": "Be like a headland of rock",
            "phrase": "“Be like a headland of rock” (IV.49)",
            "greek": "Ὅμοιον εἶναι τῇ ἄκρᾳ, ᾗ διηνεκῶς τὰ κύματα προσρήγνυται",
            "comparisons": "Farquharson: “Be like a headland of rock” · Hammond: “Be like the headland” · Hays: “Like theisi headland of rock”",
            "note": "The headland does not wish for the sea to stop having waves; its stillness tames the water around its base."
        }
    ],
    "V.1": [
        {
            "key": "v-1-orthros",
            "match": "In the morning, when you feel loth to rise",
            "phrase": "“when you feel loth to rise” (V.1)",
            "greek": "Ὄρθρου, ὅταν δυσόκνως ἐξεγείρῃ",
            "comparisons": "Farquharson: “when you feel loth to rise” · Hammond: “when you are reluctant to get up” · Hays: “At dawn, when you have trouble getting out of bed”",
            "note": "One of the most human moments in antiquity: the Roman emperor arguing with himself under the warm blankets on a cold Danubian morning."
        }
    ],
    "V.16": [
        {
            "key": "v-16-baptetai",
            "match": "such will be the inclination of your mind; for the soul is dyed by the thoughts",
            "phrase": "“the soul is dyed by the thoughts” (V.16)",
            "greek": "βάπτεται γὰρ ὑπὸ τῶν φαντασιῶν ἡ ψυχή (baptetai gar hypo tōn phantasiōn hē psychē)",
            "comparisons": "Farquharson: “the soul is dyed by the thoughts” · Hammond: “the soul is dyed the colour of its thoughts” · Hays: “The soul becomes dyed with the color of its thoughts”",
            "note": "*Baptetai* is a wool-dyer’s verb: whatever impressions you soak your attention in will permanently tint your character."
        }
    ],
    "V.20": [
        {
            "key": "v-20-road",
            "match": "the obstacle to the work becomes the work, and what stands in the way becomes the way",
            "phrase": "“what stands in the way becomes the way” (V.20)",
            "greek": "πρὸ ἔργου γίνεται τὸ ἐπὶ τοῦ ἔργου τούτου ἐφεκτικόν καὶ πρὸ ὁδοῦ τὸ τῆς ὁδοῦ ταύτης ἐνστατικόν",
            "comparisons": "Farquharson / Hays: “What stands in the way becomes the way” · Hammond: “what blocks the road helps you on your road”",
            "note": "Through *peritropē* (mental reversal), the ruling mind converts any external hindrance into raw training material for virtue."
        }
    ],
    "VI.6": [
        {
            "key": "vi-6-revenge",
            "match": "The noblest kind of retribution is not to become like your enemy",
            "phrase": "“noblest kind of retribution…” (VI.6)",
            "greek": "Ἄριστος τρόπος τοῦ ἀμύνεσθαι τὸ μὴ ἐξομοιοῦσθαι",
            "comparisons": "Farquharson: “The noblest kind of retribution is not to become like your enemy” · Hammond: “The best form of defence is not to assimilate yourself” · Hays: “The best revenge is not to be like that”",
            "note": "Six Greek words in total. *Amynesthai* bridges self-defense and requital."
        }
    ],
    "VI.52": [
        {
            "key": "vi-52-opinion",
            "match": "You have the power to form no opinion about this matter",
            "phrase": "“form no opinion about this matter” (VI.52)",
            "greek": "Ἔξεστι περὶ τούτου μηδὲν ὑπολαμβάνειν",
            "comparisons": "Farquharson / Hammond: “form no opinion on this matter” · Hays: “You don’t have to turn this into something”",
            "note": "External objects have no natural power (*physis poiētikē*) to manufacture our judgments; we can simply decline to comment."
        }
    ],
    "VI.54": [
        {
            "key": "vi-54-hive",
            "match": "What does not benefit the hive is no benefit to the bee",
            "phrase": "“What does not benefit the hive…” (VI.54)",
            "greek": "Τὸ τῷ σμήνει μὴ συμφέρον οὐδὲ τῇ μελίσσῃ συμφέρει",
            "comparisons": "Farquharson / Hammond / Hays: “What does not benefit the hive does not benefit the bee”",
            "note": "Stoic *oikeiōsis* distilled into seven Greek words: private self-interest severed from the common good is a contradiction."
        }
    ],
    "VII.21": [
        {
            "key": "vii-21-lethe",
            "match": "Near at hand is your forgetting of all things",
            "phrase": "“Near at hand is your forgetting of all things” (VII.21)",
            "greek": "Ἐγγὺς μὲν ἡ σὴ περὶ πάντων λήθη, ἐγγὺς δὲ ἡ πάντων περὶ σοῦ λήθη",
            "comparisons": "Farquharson / Hammond: “Close at hand is your forgetting of all things, and the forgetting of you by all”",
            "note": "Chiasmus in Greek (*hē sē peri pantōn lēthē / hē pantōn peri sou lēthē*) turns the dread of being forgotten into quiet symmetry."
        }
    ],
    "VII.22": [
        {
            "key": "vii-22-stumble",
            "match": "love even those who stumble",
            "phrase": "“love even those who stumble” (VII.22)",
            "greek": "Ἴδιον ἀνθρώπου φιλεῖν καὶ τοὺς πταίοντας",
            "comparisons": "Farquharson: “love even those who stumble” · Hammond: “love even those who err” · Hays: “love even those who make mistakes”",
            "note": "*Ptaiontas* literally means those who trip or stub their toe while walking."
        }
    ],
    "VII.59": [
        {
            "key": "vii-59-dig",
            "match": "Dig within",
            "phrase": "“Dig within” (VII.59)",
            "greek": "Ἔνδον σκάπτε· ἔνδον ἡ πηγὴ τοῦ ἀγαθοῦ",
            "comparisons": "Farquharson / Hammond: “Dig within / Dig inside yourself” · Long: “Look within”",
            "note": "Marcus uses the physical verb *skapte* (to dig with a spade), reminding himself that the inner spring stays clear only through active daily excavation."
        }
    ],
    "VIII.47": [
        {
            "key": "viii-47-wipe",
            "match": "wipe this out at once",
            "phrase": "“wipe this out at once” (VIII.47)",
            "greek": "τοῦτο δὲ ἤδη ἐξαλεῖψαι ἐπὶ σοί ἐστιν",
            "comparisons": "Farquharson: “wipe this out at once” · Hammond: “erase this immediately” · Hays: “revoke at any moment”",
            "note": "*Exaleipsai* is the act of smoothing flat a wax writing tablet with the blunt end of your stylus so the slate is clean."
        }
    ],
    "VIII.48": [
        {
            "key": "viii-48-citadel",
            "match": "the mind which is free from passions is a citadel",
            "phrase": "“the mind free from passions is a citadel” (VIII.48)",
            "greek": "ἀκρόπολίς ἐστιν ἡ ἐλεύθερος παθῶν διάνοια",
            "comparisons": "Farquharson / Hammond: “a citadel” · Hays: “a fortress”",
            "note": "The passage that gave Pierre Hadot his title *The Inner Citadel*: the *hēgemonikon* (governing center) cannot be conquered unless it surrenders from within."
        }
    ],
    "X.16": [
        {
            "key": "x-16-be",
            "match": "Put an end once for all to this discussion of what a good man should be, and be one",
            "phrase": "“Put an end… to this discussion… and be one” (X.16)",
            "greek": "Μηκέθ᾽ ὅλως περὶ τοῦ οἷόν τινα εἶναι τὸν ἀγαθὸν ἄνδρα διαλέγεσθαι, ἀλλὰ εἶναι τοιοῦτον",
            "comparisons": "Farquharson: “Put an end once for all to this discussion…” · Hammond: “No more roundabout discussion…” · Hays: “Waste no more time arguing what a good man should be. Be one.”",
            "note": "*Dialegesthai* refers to philosophical debate—closing the gap between talking about virtue and embodying it."
        }
    ]
}

# Lexicon of recurring Greek Stoic concepts to auto-generate rich underside notes for any stone that needs extra notes
STOIC_LEXICON = [
    ("ἡγεμονικ", "τὸ ἡγεμονικόν (to hēgemonikon)", ["governing self", "governing centre", "ruling centre", "ruling center", "governing mind", "mind"],
     "Farquharson: “governing self” · Hammond: “directing mind” · Long: “ruling faculty”",
     "The Stoic command center of the soul: the faculty of rational choice and assent that no external force can compel."),
    ("ὑπόληψ", "ὑπόληψις (hypolēpsis)", ["opinion", "supposition", "judgment", "assumption", "conception"],
     "Farquharson: “opinion / supposition” · Hammond: “judgment” · Hays: “assumption”",
     "Literally “what is taken up underneath”—our subjective value-judgment added onto a neutral event."),
    ("φαντασί", "φαντασία (phantasia)", ["imagination", "impression", "appearance", "thought"],
     "Farquharson: “imagination / impression” · Hammond: “impression”",
     "The initial mental imprint created by an event before the governing mind tests it and decides whether to assent."),
    ("κοινωνικ", "κοινωνικός (koinōnikos)", ["social", "common", "fellow", "community", "neighbour", "kinsman"],
     "Farquharson: “social / for fellowship” · Hammond: “social / community”",
     "Marcus’s most frequent ethical adjective: humans are constituted by nature as limbs of a single rational community."),
    ("φύσ", "φύσις (physis)", ["Nature", "nature", "natural", "constitution"],
     "Farquharson / Hammond: “Nature / universal Nature” · Long: “the nature of the Whole”",
     "In Stoicism, *Physis* is both the rational order of the cosmos and our own highest human constitution."),
    ("μεταβολ", "μεταβολή (metabolē)", ["change", "transformation", "altered", "dissolution"],
     "Farquharson: “change / transformation” · Hammond: “change”",
     "Nature’s continuous recycling of matter; nothing perishes into non-existence, it only transforms to keep the world young."),
    ("ἀδιάφορ", "ἀδιάφορα (adiaphora)", ["indifferent", "neither good nor evil", "external"],
     "Farquharson / Hammond: “things indifferent”",
     "Health, wealth, reputation, and pain are morally indifferent (*adiaphora*) because they happen equally to good and bad people and cannot stain character."),
    ("εὐμεν", "εὐμενής (eumenēs)", ["kind", "gentle", "propitious", "goodwill", "benevolent"],
     "Farquharson: “kind / gentle” · Hammond: “well-disposed”",
     "Warm, unresentful goodwill toward fellow humans even when they act out of ignorance.")
]


def load_aligned_verses():
    tree = ET.parse("/Users/psurry/meditations/raw/greek.xml")
    root = tree.getroot()
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}
    g_books = root.findall(".//tei:div[@subtype='book']", ns)

    verses = []
    for b in range(1, 13):
        g_chaps = {}
        for c in g_books[b - 1].findall("./tei:div[@subtype='chapter']", ns):
            n = c.attrib.get("n")
            txt = re.sub(r"\s+", " ", "".join(c.itertext())).strip()
            if b == 5 and n == "36" and "Ἐγενόμην ποτέ" in txt:
                parts = txt.split("ἀγαθαὶ δὲ μοῖραι", 1)
                g_chaps["36"] = parts[0].strip()
                g_chaps["37"] = "Ἀγαθαὶ δὲ μοῖραι" + parts[1]
            elif b == 12 and n == "17" and "ιη′" in txt:
                parts = txt.split("ιη′", 1)
                g_chaps["17"] = parts[0].strip()
                g_chaps["18"] = parts[1].strip()
            else:
                g_chaps[n] = txt

        with open(f"/Users/psurry/meditations/raw/farquharson_book_{b}.html") as f:
            s = f.read()
        s = re.sub(r"<style.*?</style>", "", s, flags=re.S)
        s = re.sub(r"<div class=\"mw-references-wrap.*?</div>", "", s, flags=re.S)
        s = re.sub(r"<sup.*?</sup>", "", s, flags=re.S)
        s = re.sub(r"</p>|<p[^>]*>|<br\s*/?>", "\n", s)
        s = re.sub(r"<[^>]+>", "", s).replace("\u200b", "")
        lines = [html.unescape(re.sub(r"\s+", " ", ln)).strip() for ln in s.split("\n")]

        f_chaps = {}
        curr_num = None
        for txt in lines:
            if not txt or txt.startswith("For Farquharson") or txt in ("Layout 2", "THE MEDITATIONS OF THE EMPEROR MARCUS ANTONINUS") or re.match(r"^BOOK [IVX]+$", txt):
                continue
            if b == 12 and txt.startswith("14–15."):
                body = txt[len("14–15."):].strip()
                p1, p2 = body.split("Does the light of the lamp", 1)
                f_chaps["14"] = p1.strip()
                f_chaps["15"] = "Does the light of the lamp" + p2
                curr_num = "15"
                continue
            if b == 12 and txt.startswith("17–18."):
                body = txt[len("17–18."):].strip()
                p1, p2 = body.split("Let your impulse be", 1)
                f_chaps["17"] = p1.strip()
                f_chaps["18"] = "Let your impulse be" + p2
                curr_num = "18"
                continue
            m = re.match(r"^(\d+)\.\s*(.*)", txt)
            if m:
                curr_num = m.group(1)
                f_chaps[curr_num] = m.group(2)
            elif curr_num:
                f_chaps[curr_num] += " " + txt

        for k in sorted(list(f_chaps.keys()), key=lambda x: int(x)):
            nxt = str(int(k) + 1)
            while nxt not in f_chaps and f" {nxt}. " in f_chaps[k]:
                parts = f_chaps[k].split(f" {nxt}. ", 1)
                f_chaps[k] = parts[0].strip()
                f_chaps[nxt] = parts[1].strip()
                k = nxt
                nxt = str(int(k) + 1)

        # Clean trailing book colophons attached to final verse
        for n in sorted(g_chaps.keys(), key=lambda x: int(x)):
            eng = f_chaps[n]
            eng = re.sub(r"\s*BOOK [IVX]+\s*$", "", eng).strip()
            ref = f"{ROMAN[b]}.{n}"
            verses.append({
                "id": ref,
                "book": b,
                "section": int(n),
                "english": eng,
                "greek": g_chaps[n]
            })
    return verses


def assign_verses_to_stones(verses):
    verse_by_id = {v["id"]: v for v in verses}
    assigned = {}
    stone_buckets = defaultdict(list)

    # 1. Assign seed verses first (first stone claiming a seed wins)
    for st in STONES_SPEC:
        for vid in st["seedVerses"]:
            if vid in verse_by_id and vid not in assigned:
                assigned[vid] = st["id"]
                stone_buckets[st["id"]].append(vid)

    # 2. Score remaining verses against stones (Books II-XII go to stones 04..48)
    candidate_stones = [st for st in STONES_SPEC if st["id"] not in ("stone-01", "stone-02", "stone-03")]

    for v in verses:
        vid = v["id"]
        if vid in assigned:
            continue
        if v["book"] == 1:
            assigned[vid] = "stone-02"
            stone_buckets["stone-02"].append(vid)
            continue

        eng_lower = v["english"].lower()
        grk = v["greek"]

        best_stone = None
        best_score = -999.0

        for st in candidate_stones:
            sid = st["id"]
            score = 0.0
            for kw in st["keywords"]:
                if kw.lower() in eng_lower:
                    score += 3.0
            for gr in st["greekRoots"]:
                if gr[:5] in grk:
                    score += 4.0
            # Overlap with words in defaultMaxim
            maxim_words = [w.lower() for w in re.findall(r"[a-zA-Z]{5,}", st["defaultMaxim"])]
            for mw in maxim_words:
                if mw in eng_lower:
                    score += 1.5
            # Slight penalty for already large buckets so stones stay balanced (~8-13 verses each)
            bucket_len = len(stone_buckets[sid])
            score -= bucket_len * 0.65

            if score > best_score:
                best_score = score
                best_stone = sid

        assigned[vid] = best_stone
        stone_buckets[best_stone].append(vid)

    # Sort each stone's verses in chronological book/section order
    for sid in stone_buckets:
        stone_buckets[sid].sort(key=lambda r: (verse_by_id[r]["book"], verse_by_id[r]["section"]))

    for v in verses:
        v["stoneId"] = assigned[v["id"]]

    return stone_buckets


def annotate_and_build_undersides(verses, stone_buckets):
    verse_by_id = {v["id"]: v for v in verses}
    stone_undersides = {}

    for st in STONES_SPEC:
        sid = st["id"]
        vids = stone_buckets[sid]
        notes = []

        # 1. Include any handcrafted notes for verses in this stone
        for vid in vids:
            if vid in HANDCRAFTED_NOTES:
                for hn in HANDCRAFTED_NOTES[vid]:
                    v = verse_by_id[vid]
                    if hn["match"] in v["english"]:
                        v["english"] = v["english"].replace(
                            hn["match"],
                            f'<span class="under-link" data-note="{hn["key"]}">{hn["match"]}</span>',
                            1
                        )
                        notes.append({
                            "key": hn["key"],
                            "phrase": hn["phrase"],
                            "greek": hn["greek"],
                            "comparisons": hn["comparisons"],
                            "note": hn["note"]
                        })

        # 2. Ensure every stone has at least 2 underside notes using the Stoic Greek lexicon
        if len(notes) < 2:
            used_lex = set()
            for vid in vids:
                if len(notes) >= 3:
                    break
                v = verse_by_id[vid]
                for idx_l, (g_stem, g_head, eng_candidates, comp, explanation) in enumerate(STOIC_LEXICON):
                    if idx_l in used_lex:
                        continue
                    if g_stem in v["greek"]:
                        # Find matching English phrase not already inside a tag
                        matched_eng = None
                        for cand in eng_candidates:
                            m = re.search(rf"\b({re.escape(cand)})\b", v["english"], flags=re.I)
                            if m and f'data-note=' not in v["english"][max(0, m.start()-35):m.end()+15]:
                                matched_eng = m.group(1)
                                break
                        if matched_eng:
                            nkey = f"{sid}-lex-{idx_l}"
                            v["english"] = re.sub(
                                rf"\b({re.escape(matched_eng)})\b",
                                f'<span class="under-link" data-note="{nkey}">\\1</span>',
                                v["english"],
                                count=1
                            )
                            notes.append({
                                "key": nkey,
                                "phrase": f"“{matched_eng}” ({vid})",
                                "greek": g_head,
                                "comparisons": comp,
                                "note": explanation
                            })
                            used_lex.add(idx_l)
                            break

        # 3. Fallback if a stone still has 0 notes: highlight the opening phrase of its first verse
        if not notes and vids:
            v0 = verse_by_id[vids[0]]
            words = v0["english"].split(" ")
            phrase_txt = " ".join(words[:min(5, len(words))]).rstrip(",.;:")
            nkey = f"{sid}-open"
            v0["english"] = v0["english"].replace(
                phrase_txt,
                f'<span class="under-link" data-note="{nkey}">{phrase_txt}</span>',
                1
            )
            g_words = v0["greek"].split(" ")
            g_snip = " ".join(g_words[:min(4, len(g_words))])
            notes.append({
                "key": nkey,
                "phrase": f"“{phrase_txt}” ({v0['id']})",
                "greek": g_snip,
                "comparisons": f"Farquharson (1944) · Book {v0['id']}",
                "note": f"Part of Marcus’s recurring reflections on {st['pillar'].lower()}."
            })

        stone_undersides[sid] = notes

    return stone_undersides


def compute_stone_affinities(verses, stone_buckets):
    verse_by_id = {v["id"]: v for v in verses}
    stone_vectors = {}
    stopwords = {
        "the", "and", "that", "this", "with", "from", "your", "have", "what", "which",
        "into", "unto", "they", "them", "their", "there", "were", "been", "when", "will",
        "shall", "would", "should", "could", "upon", "about", "such", "some", "other",
        "only", "also", "more", "most", "very", "much", "many", "make", "made", "does",
        "even", "then", "than", "those", "these", "himself", "itself", "yourself"
    }

    for st in STONES_SPEC:
        sid = st["id"]
        counts = Counter()
        for vid in stone_buckets[sid]:
            v = verse_by_id[vid]
            plain = re.sub(r"<[^>]+>", "", v["english"]).lower()
            for w in re.findall(r"[a-z]{4,}", plain):
                if w not in stopwords:
                    counts[w] += 1
        for kw in st["keywords"]:
            counts[kw.lower()] += 5
        counts[f"pillar:{st['pillar']}"] += 8
        stone_vectors[sid] = counts

    affinities = {}
    for st1 in STONES_SPEC:
        sid1 = st1["id"]
        v1 = stone_vectors[sid1]
        norm1 = math.sqrt(sum(val * val for val in v1.values())) or 1.0
        scores = []
        for st2 in STONES_SPEC:
            sid2 = st2["id"]
            if sid1 == sid2:
                continue
            v2 = stone_vectors[sid2]
            norm2 = math.sqrt(sum(val * val for val in v2.values())) or 1.0
            dot = sum(v1[k] * v2[k] for k in v1 if k in v2)
            sim = dot / (norm1 * norm2)
            scores.append((sim, sid2))
        scores.sort(key=lambda x: x[0], reverse=True)
        affinities[sid1] = [sid for _, sid in scores]

    return affinities


def main():
    verses = load_aligned_verses()
    stone_buckets = assign_verses_to_stones(verses)
    stone_undersides = annotate_and_build_undersides(verses, stone_buckets)
    affinities = compute_stone_affinities(verses, stone_buckets)

    books_out = []
    for b in range(1, 13):
        title, sub = BOOK_TITLES[b]
        books_out.append({
            "book": b,
            "roman": ROMAN[b],
            "title": title,
            "subtitle": sub,
            "verseCount": sum(1 for v in verses if v["book"] == b)
        })

    stones_out = []
    for idx, st in enumerate(STONES_SPEC, 1):
        sid = st["id"]
        stones_out.append({
            "id": sid,
            "order": idx,
            "pillar": st["pillar"],
            "defaultMaxim": st["defaultMaxim"],
            "verseIds": stone_buckets[sid],
            "underside": stone_undersides[sid],
            "affinity": affinities[sid]
        })

    dataset = {
        "meta": {
            "title": "Meditations (Τὰ εἰς ἑαυτόν)",
            "author": "Marcus Aurelius",
            "englishTranslator": "A. S. L. Farquharson (Oxford, 1944)",
            "greekEdition": "J. H. Leopold (Teubner, 1908)",
            "bookCount": len(books_out),
            "verseCount": len(verses),
            "stoneCount": len(stones_out)
        },
        "books": books_out,
        "stones": stones_out,
        "verses": verses
    }

    with open("/Users/psurry/meditations/data/meditations.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    with open("/Users/psurry/meditations/data/meditations.js", "w", encoding="utf-8") as f:
        f.write("window.MEDITATIONS_DATA = ")
        json.dump(dataset, f, ensure_ascii=False)
        f.write(";\n")

    print(f"Built dataset: {len(books_out)} books, {len(verses)} verses, {len(stones_out)} stones.")
    for s in stones_out[:10]:
        print(f"  {s['id']} ({len(s['verseIds'])} verses, {len(s['underside'])} notes): {s['defaultMaxim'][:60]}...")


if __name__ == "__main__":
    main()
