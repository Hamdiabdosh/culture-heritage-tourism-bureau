<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;

final class AuthController
{
    /** @param array<string, string> $_params */
    public static function login(array $_params = []): void
    {
        $body = json_body();
        $email = (string) ($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');
        $user = Auth::login($email, $password);
        json_response(200, ['user' => $user]);
    }

    /** @param array<string, string> $_params */
    public static function logout(array $_params = []): void
    {
        Auth::logout();
        json_response(200, ['ok' => true]);
    }

    /** @param array<string, string> $_params */
    public static function session(array $_params = []): void
    {
        $user = Auth::user();
        if ($user === null) {
            json_response(200, ['user' => null]);
        }
        json_response(200, [
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    }
}
