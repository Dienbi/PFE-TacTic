<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Manager notifications channel
Broadcast::channel('manager.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && $user->role->value === 'CHEF_EQUIPE';
});

// User notifications channel (for leave status updates)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// RH notifications channel - public channel for all RH users
// Using a public channel since we handle auth via JWT in frontend
