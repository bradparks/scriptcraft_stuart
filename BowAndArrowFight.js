/*************************************************************************
## BowAndArrowFight mini-game (derived from snowball fight)

    /js new Game_BowAndArrowFight(60).start();

***/

var bkGameMode = org.bukkit.GameMode,
bkEntityDamageByEntityEvent = org.bukkit.event.entity.EntityDamageByEntityEvent,
bkItemStack = org.bukkit.inventory.ItemStack,
bkMaterial = org.bukkit.Material,
bkArrow = org.bukkit.entity.Arrow;

var _startGame = function( gameState ) {
    var i,
    teamName,
    team,
    player;

    // don't let game start if already in progress (wait for game to finish)
    if ( gameState.inProgress ) {
        return;
    }
    gameState.inProgress = true;
    // reset timer
    gameState.duration = gameState.originalDuration;
    // put all players in survival mode and give them each enough ammo
    for ( i = 10; i < gameState.duration; i += 10 ) {
        gameState.ammo.push( gameState.ammo[ 0 ] );
    }

    for ( teamName in gameState.teams ) {
        gameState.teamScores[teamName] = 0;
        team = gameState.teams[ teamName ];
        for ( i = 0; i < team.length; i++ ) {
            player = server.getPlayer( team[i] );
            gameState.savedModes[ player.name ] = player.gameMode;
            player.gameMode = bkGameMode.SURVIVAL;
            player.inventory.addItem( gameState.ammo );
            player.inventory.addItem( gameState.bow );
        }
    }
};
/*
 end the game
 */
var _endGame = function( gameState ) {
    var scores = [],
    leaderBoard = [],
    tn,
    i,
    teamName,
    team,
    player,
    handlerList;

    leaderBoard  = [];
    for ( tn in gameState.teamScores){
        leaderBoard.push([tn,gameState.teamScores[tn]]);
    }
    leaderBoard.sort(function(a,b){ return b[1] - a[1];});

    for ( i = 0; i < leaderBoard.length; i++ ) {
        scores.push( 'Team ' + leaderBoard[i][0] + ' scored ' + leaderBoard[i][1] );
    }

    for ( teamName in gameState.teams ) {
        team = gameState.teams[teamName];
        for ( i = 0; i < team.length; i++ ) {
            // restore player's previous game mode and take back snowballs
            player = server.getPlayer( team[i] );
            player.gameMode = gameState.savedModes[ player.name ];
            player.inventory.removeItem( gameState.ammo );
            player.sendMessage( 'GAME OVER.' );
            player.sendMessage( scores );
        }
    }
    gameState.listener.unregister();
    gameState.inProgress = false;
};
/*
 get the team the player belongs to
 */
var _getTeam = function( player, pteams ) {
    var teamName,
    team,
    i;
    for ( teamName in pteams ) {
        team = pteams[ teamName ];
        for ( i = 0; i < team.length; i++ ) {
            if ( team[i] == player.name ) {
                return teamName;
            }
        }
    }
    return null;
};
/*
 construct a new game
 */
var createGame = function( duration, teams ) {
    var players,
    i,
    _snowBalls = new bkItemStack( bkMaterial.ARROW, 64 ),
    _bow = new bkItemStack( bkMaterial.BOW, 1)
    ;

    var _gameState = {
        teams: teams,
        duration: duration,
        originalDuration: duration,
        inProgress: false,
        teamScores: {},
        listener: null,
        savedModes: {},
        ammo: [ _snowBalls ],
        bow: [ _bow ]
    };
    if ( typeof duration == 'undefined' ) {
        duration = 60;
    }
    if ( typeof teams == 'undefined' ) {
        /*
          wph 20130511 use all players
        */
        teams =  [];
        players = server.onlinePlayers;
        for ( i = 0; i < players.length; i++ ) {
            teams.push( players[i].name );
        }
    }
    //
    // allow for teams param to be either {red:['player1','player2'],blue:['player3']} or
    // ['player1','player2','player3'] if all players are against each other (no teams)
    //
    if ( teams instanceof Array ) {
        _gameState.teams = {};
        for ( i = 0;i < teams.length; i++ ) {
            _gameState.teams[ teams[i] ] = [ teams[i] ];
        }
    }
    /*
      this function is called every time a player is damaged by another entity/player
    */
    var _onArrowHit = function( event ) {
        var arrow = event.damager;
        if ( !arrow || !( arrow instanceof bkArrow ) ) {
            return;
        }
        var throwersTeam = _getTeam( arrow.shooter, _gameState.teams );
        var damageeTeam = _getTeam( event.entity, _gameState.teams);
        if ( !throwersTeam || !damageeTeam ) {
            return; // thrower/damagee wasn't in game
        }
        if ( throwersTeam != damageeTeam ) {
            _gameState.teamScores[ throwersTeam ]++;
        } else {
            _gameState.teamScores[ throwersTeam ]--;
        }
    };

    return {
        start: function( ) {
            _startGame( _gameState );
            _gameState.listener = events.on(bkEntityDamageByEntityEvent,_onArrowHit);
            new java.lang.Thread( function( ) {
                while ( _gameState.duration-- ) {
                    java.lang.Thread.sleep( 1000 ); // sleep 1,000 millisecs (1 second)
	        }
                _endGame(_gameState);
            } ).start( );
        }
    };
};
exports.Game_BowAndArrowFight = createGame;
