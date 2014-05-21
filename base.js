var base = this;

var myRace = 'ogres';
var otherRace = (myRace === 'humans' ? 'ogres' : (myRace === 'ogres' ? 'humans' : 'unknown'));

var unitTypes = {
    collector: {
        humans: 'peasant',
        ogres: 'peon'
    },
    weak: {
        humans: 'soldier',
        ogres: 'munchkin'
    },
    attacker: {
        humans: 'knight',
        ogres: 'ogre'
    },
    mage: {
        humans: 'librarian',
        ogres: 'shaman'
    },
    flying: {
        humans: 'griffin-rider',
        ogres: 'fangrider'
    },
    boss: {
        humans: 'captain',
        ogres: 'brawler'
    }
};

var items = base.getItems();
var targetedItems = [];

var collectors = {};
    collectors[myRace] = base.getByType(unitTypes.collector[myRace]);
    collectors[otherRace] = base.getByType(unitTypes.collector[otherRace]);
var weaklings = {};
    weaklings[myRace] = base.getByType(unitTypes.weak[myRace]);
    weaklings[otherRace] = base.getByType(unitTypes.weak[otherRace]);
var attackers = {};
    attackers[myRace] = base.getByType(unitTypes.attacker[myRace]);
    attackers[otherRace] = base.getByType(unitTypes.attacker[otherRace]);
var mages = {};
    mages[myRace] = base.getByType(unitTypes.mage[myRace]);
    mages[otherRace] = base.getByType(unitTypes.mage[otherRace]);
var flyings = {};
    flyings[myRace] = base.getByType(unitTypes.flying[myRace]);
    flyings[otherRace] = base.getByType(unitTypes.flying[otherRace]);
var bosses = {};
    bosses[myRace] = base.getByType(unitTypes.boss[myRace]);
    bosses[otherRace] = base.getByType(unitTypes.boss[otherRace]);


// Available items:
// this.type = "gem"
// this.type = "gold-coin"

function isEnemyCollectorMovingTo(pos)
{
    var enemyCollectors = base.getByType(collectors[otherRace]);
    for(var key in enemyCollectors)
    {
        var enemy = enemyCollectors[key];
        if(enemy.targetPos.x == pos.x && enemy.targetPos.y == pos.y)
        {
            return enemy;
        }
    }
    
    return null;
}

function willEnemyUnitReachItemFirst(item, collectorUnit)
{
    var enemyCollector = isEnemyCollectorMovingTo(item.pos);
    
    if(enemyCollector)
    {
        return ( item.distance(collectorUnit) > item.distance(enemyCollector) );
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

// Actually send collector units
var friendlyCollectors = collectors[myRace];

for(var i = 0; i < friendlyCollectors.length; i++){

    var collector = friendlyCollectors[i];
    var item = getHighestPriorityItem(collector);
    if (item && item.pos)
        base.command(collector, 'move', item.pos);
        //base.say('Moving collector to (' + item.pos.x + ',' + item.pos.y + ')');

}

/////// 2. Decide which unit to build this frame. ///////
// Peons can gather gold; other units auto-attacker the enemy base.
// You can only build one unit per frame, if you have enough gold.
var type;
if (friendlyCollectors.length < 3)
{
    type = unitTypes.collector[myRace];
}
else
{
    if (attackers[myRace].length < 2)
    {
        type = unitTypes.attacker[myRace];
    }
    else
    {
        if (mages[myRace].length < 1)
        {
            type = unitTypes.mage[myRace];
        }
        else
        {
            if (flyings[myRace].length < 2)
            {
                type = unitTypes.flying[myRace];
            }
            else
            {
                // Build moar attackers!
                type = unitTypes.attacker[myRace];
            }
        }
    }
}
if (base.buildables[type] && base.gold >= base.buildables[type].goldCost)
{
    base.build(type);
}
else
{
    base.say('Want to build type: ' + type);
}