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

base.items = base.getItems();
base.targetedItems = [];

base.collectors = {};
base.collectors[ourRace] = base.getByType(unitTypes.collector[ourRace]);
base.collectors[otherRace] = base.getByType(unitTypes.collector[otherRace]);
base.weaklings = {};
base.weaklings[ourRace] = base.getByType(unitTypes.weak[ourRace]);
base.weaklings[otherRace] = base.getByType(unitTypes.weak[otherRace]);
base.attackers = {};
base.attackers[ourRace] = base.getByType(unitTypes.attacker[ourRace]);
base.attackers[otherRace] = base.getByType(unitTypes.attacker[otherRace]);
base.mages = {};
base.mages[ourRace] = base.getByType(unitTypes.mage[ourRace]);
base.mages[otherRace] = base.getByType(unitTypes.mage[otherRace]);
base.flyings = {};
base.flyings[ourRace] = base.getByType(unitTypes.flying[ourRace]);
base.flyings[otherRace] = base.getByType(unitTypes.flying[otherRace]);
base.bosses = {};
base.bosses[ourRace] = base.getByType(unitTypes.boss[ourRace]);
base.bosses[otherRace] = base.getByType(unitTypes.boss[otherRace]);

base.isEnemyCollectorMovingTo = function(pos)
{
    var enemyCollectors = base.collectors[otherRace];
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
};

base.willEnemyUnitReachItemFirst = function(item, collectorUnit)
{
    var enemyCollector = base.isEnemyCollectorMovingTo(item.pos);

    if(enemyCollector)
    {
        return ( item.distance(collectorUnit) > item.distance(enemyCollector) );
    }
    else
    {
        return false;
    }
};

base.getHighestPriorityItem = function(collector)
{
    var highestPriorityItem = {'priority': 0};

    for(var itemKey in base.items)
    {
        if(base.items.hasOwnProperty(itemKey)){
            var item = base.items[itemKey];
            item.priority = item.bountyGold / item.distance(collector);
            // If current priority higher than previous items and item not targeted by other friendly,
            // set current item to highest priority
            if(item.priority > highestPriorityItem.priority &&
                (base.targetedItems[item.id] !== true))
            {
                if(!base.willEnemyUnitReachItemFirst(item, collector) || highestPriorityItem.priority === 0)
                {
                    highestPriorityItem = item;
                }
            }
        }
    }

    return highestPriorityItem;
};

base.getTotalEnemyDPS = function()
{
    var total = 0;
    total += base.weaklings[otherRace].length * 10;
    total += base.attackers[otherRace].length * 16;
    total += base.mages[otherRace].length * 10;  /* Real DPS is 6, but correct for OP distance advantage */
    total += base.flyings[otherRace].length * 20; /* Real DPS is 15, but correct for OP distance advantage */
    total += base.bosses[otherRace].length * 27;
    return total;
};

base.getTotalFriendlyDPS = function()
{
    var total = 0;
    total += base.weaklings[ourRace].length * 10;
    total += base.attackers[ourRace].length * 16;
    total += base.mages[ourRace].length * 10;  /* Real DPS is 6, but correct for OP distance advantage */
    total += base.flyings[ourRace].length * 20; /* Real DPS is 15, but correct for OP distance advantage */
    total += base.bosses[ourRace].length * 27;
    return total;
};

base.getEnemyDistanceToBase = function()
{
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
    return minDistance;
};

// Actually send collector units
var friendlyCollectors = base.collectors[ourRace];

for(var i = 0; i < friendlyCollectors.length; i++){

    var collector = friendlyCollectors[i];
    base.targetedItems[collector.currentlyTargeting] = null;
    collector.currentlyTargeting = null;

    var item = base.getHighestPriorityItem(collector);
    if (item && item.pos)
    {
        base.command(collector, 'move', item.pos);
        base.targetedItems[item.id] = true;
        collector.currentlyTargeting = item.id;
    }
}

/////// 2. Decide which unit to build this frame. ///////
// Peons can gather gold; other units auto-attacker the enemy base.
// You can only build one unit per frame, if you have enough gold.

var strategies = {
    goldDigger: {
        shouldDisrupt: function(scope){
            return false;
        },
        initialise: function(scope){
            var base = scope;
            base.isCurrentStrategyDisruptable = false;
        },
        execute: function(scope){
            var base = scope;
            var collectorType = unitTypes.collector[ourRace];
            if( base.collectors[ourRace].length < base.collectors[otherRace].length || base.collectors[ourRace].length < 3 )
            {
                /* Do not allow disruption until we have a good economy */
                base.isCurrentStrategyDisruptable = false;

                if(base.gold >= base.buildables[collectorType].goldCost)
                {
                    base.build(collectorType);
                    base.say("For the gains!");
                }
                else
                {
                    /* Starting up our economy */
                    base.say("Startups are cool!");
                }
            }
            else
            {
                /* If our economy is good, allow disruption */
                base.isCurrentStrategyDisruptable = true;
                base.say("Hoarding! " + base.collectors[ourRace].length + " " + base.collectors[otherRace].length);
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
        shouldDisrupt: function(scope){
            var base = scope;
            var enemyDPS = base.getTotalEnemyDPS();
            var ourDPS = base.getTotalFriendlyDPS();
            var shortestEnemyDistance = base.getEnemyDistanceToBase();

            return (enemyDPS - ourDPS > 20 || shortestEnemyDistance <= 40);
        },
        initialise: function(scope){
            var base = scope;
            base.isCurrentStrategyDisruptable = false;
        },
        execute: function(scope){
            var base = scope;
            var enemyDPS = base.getTotalEnemyDPS();
            var ourUnitDPS = 16;
            var attackersNeeded = enemyDPS / ourUnitDPS + 1;
            var attackerType = unitTypes.attacker[ourRace];
            var mageType = unitTypes.mage[ourRace];
            var shortestEnemyDistance = base.getEnemyDistanceToBase();
            var cost = (attackersNeeded * base.buildables[attackerType].goldCost) + base.buildables[mageType].goldCost;

            /* Never allow disruption from defensive strategy */
            base.isCurrentStrategyDisruptable = false;
            base.say("Oh no you didn't! " + enemyDPS + " " + attackersNeeded + " " + shortestEnemyDistance);

            if(!this.attackersBuilt)
            {
                this.attackersBuilt = 0;
            }
            if(!this.magesBuilt)
            {
                this.magesBuilt = 0;
            }

            if( !this.begun && (shortestEnemyDistance > 40) )
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

            return true;
        }
    }
};

/* Set initial strategy, and save state */
if(!base.currentStrategy)
{
    base.currentStrategy = strategies.goldDigger;
}

/* Strategy override loop */
if(base.isCurrentStrategyDisruptable)
{
    for(var key in strategies)
    {
        var strategy = strategies[key];
        if(strategy.shouldDisrupt(base)){
            base.currentStrategy = strategy;
            base.currentStrategy.initialise(base);
            if(!base.isCurrentStrategyDisruptable)
            {
                break;
            }
        }
    }
}

/* Run current strategy */
if(base.currentStrategy.execute(base))
{
    /* If current strategy completed and does not require being called again, switch back to goldDigger */
    base.currentStrategy = strategies.goldDigger;
}