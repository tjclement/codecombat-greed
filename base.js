var base = this;

var ourRace = (base.id == 'Human Base' ? 'humans' : (base.id == 'Ogre Base' ? 'ogres' : 'unknown'));
var otherRace = (ourRace === 'humans' ? 'ogres' : (ourRace === 'ogres' ? 'humans' : 'unknown'));

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
collectors[ourRace] = base.getByType(unitTypes.collector[ourRace]);
collectors[otherRace] = base.getByType(unitTypes.collector[otherRace]);
var weaklings = {};
weaklings[ourRace] = base.getByType(unitTypes.weak[ourRace]);
weaklings[otherRace] = base.getByType(unitTypes.weak[otherRace]);
var attackers = {};
attackers[ourRace] = base.getByType(unitTypes.attacker[ourRace]);
attackers[otherRace] = base.getByType(unitTypes.attacker[otherRace]);
var mages = {};
mages[ourRace] = base.getByType(unitTypes.mage[ourRace]);
mages[otherRace] = base.getByType(unitTypes.mage[otherRace]);
var flyings = {};
flyings[ourRace] = base.getByType(unitTypes.flying[ourRace]);
flyings[otherRace] = base.getByType(unitTypes.flying[otherRace]);
var bosses = {};
bosses[ourRace] = base.getByType(unitTypes.boss[ourRace]);
bosses[otherRace] = base.getByType(unitTypes.boss[otherRace]);

function isEnemyCollectorMovingTo(pos)
{
    var enemyCollectors = collectors[otherRace];
    for(var key in enemyCollectors)
    {
        if(enemyCollectors.hasOwnProperty(key)){
            var enemy = enemyCollectors[key];
            if(enemy.targetPos && pos &&
                Math.floor(enemy.targetPos.x) == Math.floor(pos.x) &&
                Math.floor(enemy.targetPos.y) == Math.floor(pos.y))
            {
                return enemy;
            }
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

function getHighestPriorityItem(collector)
{
    var highestPriorityItem = {'priority': 0};

    for(var itemKey in items)
    {
        if(items.hasOwnProperty(itemKey)){
            var item = items[itemKey];
            item.priority = item.bountyGold / item.distance(collector);
            // If current priority higher than previous items and item not targeted by other friendly,
            // set current item to highest priority
            if(item.priority > highestPriorityItem.priority &&
                !(targetedItems[item.id]))
            {
                if(!willEnemyUnitReachItemFirst(item, collector) || highestPriorityItem.priority == 0)
                {
                    highestPriorityItem = item;
                }
            }
        }
    }
    
    return highestPriorityItem;
}

function getTotalEnemyDPS(){
    var total = 0;
    total += weaklings[otherRace].length * 10;
    total += attackers[otherRace].length * 16;
    total += mages[otherRace].length * 10;  /* Real DPS is 6, but correct for OP distance advantage */
    total += flyings[otherRace].length * 20; /* Real DPS is 15, but correct for OP distance advantage */
    total += bosses[otherRace].length * 27;
    return total;
}

function getTotalFriendlyDPS(){
    var total = 0;
    total += weaklings[ourRace].length * 10;
    total += attackers[ourRace].length * 16;
    total += mages[ourRace].length * 10;  /* Real DPS is 6, but correct for OP distance advantage */
    total += flyings[ourRace].length * 20; /* Real DPS is 15, but correct for OP distance advantage */
    total += bosses[ourRace].length * 27;
    return total;
}

function getEnemyDistanceToBase(){
    var minDistance = 9999;
    var enemies = base.getEnemies();
    for(var key in enemies)
    {
        if(enemies && enemies.hasOwnProperty(key)){
            var enemy = enemies[key];
            if(enemy && enemy.type != unitTypes.collector[otherRace])
            {
                var dist = base.distance(enemy);
                minDistance = dist < minDistance ? dist : minDistance;
            }
        }
    }
}

// Actually send collector units
var friendlyCollectors = collectors[ourRace];

for(var i = 0; i < friendlyCollectors.length; i++){

    var collector = friendlyCollectors[i];
    targetedItems[collector.currentlyTargeting] = null;
    collector.currentlyTargeting = null;

    var item = getHighestPriorityItem(collector);
    if (item && item.pos)
    {
        base.command(collector, 'move', item.pos);
        targetedItems[item.id] = true;
        collector.currentlyTargeting = item.id;
    }
}

/////// 2. Decide which unit to build this frame. ///////
// Peons can gather gold; other units auto-attacker the enemy base.
// You can only build one unit per frame, if you have enough gold.

var strategies = {
    goldDigger: {
        disruptable: true,
        shouldDisrupt: function(){
            return false;
        },
        execute: function(){
            var collectorType = unitTypes.collector[ourRace];
            if(base.gold >= base.buildables[collectorType].goldCost
                && (/*collectors[ourRace].length < collectors[otherRace].length ||*/ collectors[ourRace].length < 3))
            {
                base.build(collectorType);
                base.say("For the gains!");
            }
            else
            {
                base.say("Hoarding! " + friendlyCollectors.length + " " + collectors[otherRace].length);
            }

            return false;  /* Select goldDigger again next frame */
        }
    },
    defensive: {
        /* Not allowed to set these properties because of bug in CC API protection:
         * http://discourse.codecombat.com/t/greed-properties-of-object-assigned-to-this-are-read-only/834
         */
        /*begun: false,
        attackersBuilt: 0,
        magesBuilt: 0,*/
        disruptable: false,
        shouldDisrupt: function(){
            var enemyDPS = getTotalEnemyDPS();
            var ourDPS = getTotalFriendlyDPS();
            var shortestEnemyDistance = getEnemyDistanceToBase();

            return (enemyDPS - ourDPS > 20 || shortestEnemyDistance <= 40);
        },
        execute: function(){
            var enemyDPS = getTotalEnemyDPS();
            var ourUnitDPS = 16;
            var attackersNeeded = enemyDPS / ourUnitDPS + 1;
            var attackerType = unitTypes.attacker[ourRace];
            var mageType = unitTypes.mage[ourRace];
            var shortestEnemyDistance = getEnemyDistanceToBase();
            var cost = (attackersNeeded * base.buildables[attackerType].goldCost) + base.buildables[mageType].goldCost;

            base.say("Oh no you didn't!");

            if( !this.begun && (shortestEnemyDistance > 30) && (base.gold < cost) )
            {
                base.say("nem");
                return false;
            }
            else if(this.attackersBuilt < attackersNeeded)
            {
                this.begun = true;
                if(base.gold >= base.buildables[attackerType].goldCost)
                {
                    base.build(attackerType);
                    this.attackersBuilt++;
                }
                return false;
            }
            else if(this.magesBuilt < 1)
            {
                if(base.gold >= base.buildables[mageType].goldCost)
                {
                    base.build(mageType);
                    this.magesBuilt++;
                    return true;
                }
                return false;
            }
        }
    }
};

/* Set initial strategy, and save state */
if(!this.currentStrategy)
{
    this.currentStrategy = strategies.goldDigger;
}

/* Strategy override loop */
if(this.currentStrategy.disruptable)
{
    for(var key in strategies)
    {
        var strategy = strategies[key];
        if(strategy.shouldDisrupt()){
            this.currentStrategy = strategy;
            if(!this.currentStrategy.disruptable)
            {
                break;
            }
        }
    }
}

/* Run current strategy */
this.currentStrategy.execute();