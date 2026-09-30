# Classroom game context

## Audience and goal

Undergraduate Cloud/DevOps beginners play a 10–12 minute team activity from one public URL. Each tab is independent. The game should feel like a small rescue mission, not a cloud dashboard: one obvious next move, a visible 3D network, and short explanations of consequences.

The approved visual direction is **Cloud Crew / tabletop tactics**: warm paper, dark teal ink, orange warning accents, mission slips and a three-step rail. The existing 3D simulation remains the playfield. Do not replace it with a static illustration. Earlier mockups are in ignored `.superpowers/brainstorm/` local files.

## Player flow

1. Intro: save the app, survive a spike, repair an outage. The first setup is paused.
2. Launch: connect Primary Compute → Database, place and inspect Monitoring, press **Start traffic**, inspect traffic, and serve four requests.
3. Spike: upgrade Primary Compute **or** place Backup Compute and connect Load Balancer → Backup → Database. Serve 15 requests across at least 30 seconds with at least 65% phase availability.
4. Incident: Database goes offline. Inspect Monitoring, restore it for free, and confirm eight successful requests after recovery.
5. Report: availability, budget remaining, completed missions, and Cloud/DevOps concepts. A seven-minute simulated clock can end a delayed run; restart begins a clean one.

## Money and instruction rules

The user reported that unexplained budget loss and ambiguous boxes made the game hard to understand. Upfront purchases reduce budget immediately; after traffic begins, services charge upkeep and successful requests can earn rewards. The balance can therefore rise or fall. The game says this in the intro, HUD, and expandable help. `src/classroom-guide.js` chooses the next instruction from actual state; update its tests when changing steps. Hide completed or irrelevant controls instead of showing every service at once.

## Classroom constraints

No login, room codes, multiplayer, backend, paid services, or installation. Preserve MIT/copyright notices. The README has the two-minute facilitator introduction, schedule, debrief questions, and concept mapping.
