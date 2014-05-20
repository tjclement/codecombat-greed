// This code runs once per frame. Build units and command peons!
// Destroy the human base within 180 seconds.
// Run over 4000 statements per call and chooseAction will run less often.
// Check out the green Guide button at the top for more info.

var base = this;

/////// 1. Command peons to grab coins and gems. ///////
// You can only command peons, not fighting units.
// You win by gathering gold more efficiently to make a larger army.
// Click on a unit to see its API.

var items = base.getItems();
var peons = base.getByType('peon');
var ogres = base.getByType('ogre');
var shamans = base.getByType('shaman');
var fangriders = base.getByType('fangrider');
var targetedItems = [];

// Available items:
// this.type = "gem"
// this.type = "gold-coin"

function isEnemyUnitMovingTo(pos)
{
    var enemies = base.getByType('peasants');
    for(var key in enemies)
    {
        var enemy = enemies[key];
        if(enemy.targetPos.x == pos.x && enemy.targetPos.y == pos.y)
        {
            return enemy;
        }
    }
    
    return null;
}

function willEnemyUnitReachItemFirst(item, peon)
{
    var enemy = isEnemyUnitMovingTo(item.pos);
    
    if(enemy)
    {
        return ( item.distance(peon) > item.distance(enemy) );
    }
    else
    {
        return false;
    }
}

function getHighestPriorityItem(peon)
{
    var highestPriorityItem = {'priority': 0};

    for(var itemKey in items)
    {
        var item = items[itemKey];
        item.priority = item.bountyGold / item.distance(peon);
        // If current priority higher than previous items and item not targeted by other friendly,
        // set current item to highest priority
        if(item.priority > highestPriorityItem.priority &&
            !(itemKey in targetedItems) &&
            !willEnemyUnitReachItemFirst(item, peon))
        {
            highestPriorityItem = item;
            targetedItems[itemKey] = true;
        }
    }
    
    return highestPriorityItem;
}

for (var peonIndex = 0; peonIndex < peons.length; peonIndex++) {
    var peon = peons[peonIndex];
    var item = getHighestPriorityItem(peon);
    if (item)
        base.command(peon, 'move', item.pos);
}


/////// 2. Decide which unit to build this frame. ///////
// Peons can gather gold; other units auto-attack the enemy base.
// You can only build one unit per frame, if you have enough gold.
var type;
if (peons.length < 3)
    type = 'peon';
else
    if (ogres.length < 2)
        type = 'ogre';
    else
        if (shamans.length < 1)
            type = 'shaman';
        else
            if (fangriders.length < 2)
                type = 'fangrider';
            else
                type = 'ogre';
if (base.buildables[type] && base.gold >= base.buildables[type].goldCost)
{
    base.build(type);
}
else
{
    base.say('I can\'t build type: ' + type);
}


// 'peon': Peons gather gold and do not fight.
// 'munchkin': Light melee unit.
// 'ogre': Heavy melee unit.
// 'shaman': Support spellcaster.
// 'fangrider': High damage ranged attacker.
// 'brawler': Mythically expensive super melee unit.
// See the buildables documentation below for costs and the guide for more info.