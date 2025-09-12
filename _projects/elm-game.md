---
layout: page
title: Elm Game — Journey Through Seasons
description: A comforting pixel-art puzzle platformer about memory, seasons, and a loyal companion.
img: assets/img/title.png
importance: 2
category: fun
permalink: /projects/elm-game/
---

- Link to play: [Open game page]({{ '/elm_game/' | relative_url }})
- Trailer/SMV:

<video src="{{ '/assets/video/smv.mp4' | relative_url }}" controls style="max-width:100%; height:auto;" preload="metadata"></video>

## Game Story

In a pixelated world filled with tranquility and beauty, a young girl's beloved dog has journeyed to the planet Wango due to an unexpected accident. Inspired by the famous quote from "COCO", "death is not the end, but rather the act of forgetting", she embarks on a journey to gain her lost memories with her dog through the four seasons, each represented by the corresponding twenty-four solar terms.

## Background

Our game is a comforting and pixel art style puzzle platformer, which features a light-hearted and healing atmosphere, with a focus on exploration and discovery. The main character, in search of her dog, must navigate through a maze of obstacles and collect fragments of her memories and traverse through various levels. Each memory shard brings her closer to remembering her adventures with her dog. And along the way, she needs to collect fruits that grant her newfound strength to move on. As she reaches the exit of all levels, she has gathered all the memory shards. Aggregating all the shards together symbolizes the complete recollection of her time spent with her furry friend on the distant planet Wango. Therefore the loyal companion will exist in her memory forever.

#### Simply puzzle ideas, not really difficult puzzles, nor how they are implemented in the actual game.

### Winter (the tutorial level)

1. Beginning of Winter: A key lying on the ground, easy for the player to see, and hints to indicate the player to pick it up and open the box for item. Buff: no special buff.
2. Light snow: Another box with an item in it that let the player choose from between the prior item. Also hint the player use the "return" ability. Buff: jump height decrease a little bit.
3. Heavy snow: Hint player use super jumping jump to a high position, which cannot be reached by normal jump and is difficult to reach by wall jump. Buff: jump height decrease a lot.
4. Winter Solstice: Tell player the solarterm buff will affect him. Buff: speed toward right decrease.
5. Lesser Cold: Some strange terrain to let the player go through. Buff: speed toward left decrease.
6. Greater cold: Two holes infront of character, hint player to go down and observe which one is exit, i.e.:

```
|        |    |
|        |    |
|not exit|exit|
```

Buff: speed toward right decrease.

### Autumn

1. Beginning of Autumn: The player needs to collect falling leaves which will be used in the next map. Buff: none
2. End of heat: Reading the tips on the leaves, players need to workout and go to certain places to get the potion and a key.
3. White Dew: The player needs to collect ripe crops by interacting with them after getting the scyche. The crop can be used to disperse the monster of hunger and go through the door. Buff: none
4. Autumnal Equinox: A door opened after player collected. Some special brick under player, hint player to get spade back to dig these bricks to go forward. Player need to dig the proper brick, otherwise they will touch traps. Hint player go back to get item at the beginning. Buff: move speed decreased.
5. Cold Dew: Open a treasure box then get the mountaineering.
6. First Frost: A difficult route for player to jump to the exit.

### Summer

1. Beginning of Summer: Jump out of the starting hole to collect the merry-go-round ticket towards the upper world.
2. Lesser Fullness: Destiny in summer ended here!
3. Grain in Ear: Relatively easy journey. Watch out for your way beneath.
4. Summer Solstice: You've entered the core of vortex (eddy) in this sea area. If accidentally bumped into thorn, please wait for your revival at the resurrection point.
5. Lesser Heat: Hidden place, only if you're curious.
6. Greater Heat: You'll fall down to here after going through the labyrinth of Lesser Heat.

### Spring (Use camera for a bigger and integrated map)

1. Insect awakening: Insects attack the girl and the player need to use a previously collected ultraviolet lamp to kill them.
2. Where the last piece of memory shard locates. Spring solar terms are mild and gentle, so characteristics of spring puzzle are vast and peaceful. Players will be owed by the vastness of six solar terms in Beginning of Spring, Rain Water, Insects Awakening, Spring Equinox, Fresh Green, and Grain Rain. Relaxed, the last mile will be cheerful.

---

| Spring              | Summer              | Autumn              | Winter              |
| ------------------- | ------------------- | ------------------- | ------------------- |
| Beginning of Spring | Beginning of Summer | Beginning of Autumn | Beginning of Winter |
| Rain Water          | Lesser Fullness     | End of Heat         | Light Snow          |
| Insects Awakening   | Grain in Ear        | White Dew           | Heavy Snow          |
| Spring Equinox      | Summer Solstice     | Autumnal Equinox    | Winter Solstice     |
| Fresh Green         | Lesser Heat         | Cold Dew            | Lesser Cold         |
| Grain Rain          | Greater Heat        | First Frost         | Greater Cold        |

#### Here for items:

1. Key, the most basic item, can be picked up and used to open box
2. Hook rope, another most basic item. After having got it, pressing "w" through "cooling time" will make a "super jump"
3. Leaves, with tips or instructions displayed on it. Words shown on it will change in different places.
4. Mountaineer, enable you to do wall jump.
5. Spade, which can be used to collect special items.
6. Scyche, which can be used to collect special items.

## Pitching

### Experience

- The player can use keys to control the character, trying to overcome many obstacles to finally reach goals.
- Acquire different items or skills and use them properly.
- Defeat some small monsters that are in the way.

### Mechanics

- 2D puzzle-focused platformer game
- Control a character moving in the different rooms.
- Use jump or other motion to get across obstacles.
- Collect items hidden or lying on the ground, or finish some puzzles to get the item.
- Various functional items, e.g. items to attack the enemy or to apply buffs and debuffs.
- Attack the enemy in an elegant and swift manner (here the enemy is more like a part of a puzzle, i.e. player needs to find some special item to hind form it or defeat it).
- Basically there are four levels, and each level has 6 rooms that match several puzzles.
- Need to solve different puzzles to finish a level.

### Story — About Solar terms

- Conflict type: Man vs. Nature/Environment, specifically the conflict between the main character and the (natural) obstacles to overcome.
- Game World: Game consists of four stages representing the four seasons, each stage has six smaller levels that corresponds with one solar term, and comes with unique art design, mechanics, and challenges.
- Gameplay: Actions such as running, jumping, and gliding, overcoming obstacles and enemies.
- Level Challenges: Moving through levels, trying to avoid or defeat enemies, finding the way to the exit, seeking extra secrets.
- Evolution and Growth: Give the heroine more abilities, enhanced motility, and higher error-tolerant through item collection and task completion.
- Game Experience: Comforting visuals, music, and story; easy to get started but (in the later stage) a little bit challenging gameplay.
