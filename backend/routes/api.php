<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\DepartmentsController;
use App\Controllers\DocumentsController;
use App\Controllers\EventsController;
use App\Controllers\InstitutionController;
use App\Controllers\MediaController;
use App\Controllers\NewsController;
use App\Controllers\PagesController;
use App\Controllers\PeopleController;
use App\Controllers\ServicesController;
use App\Controllers\SitemapController;
use App\Controllers\UsersController;

/**
 * Route table matching docs/PASS4_PHP_API_CONTRACT.md
 *
 * Paths are relative to /api (front controller strips the /api prefix).
 *
 * @return list<array{method:string,pattern:string,handler:callable}>
 */
return [
    // Auth
    ['method' => 'POST', 'pattern' => '/auth/login', 'handler' => [AuthController::class, 'login']],
    ['method' => 'POST', 'pattern' => '/auth/logout', 'handler' => [AuthController::class, 'logout']],
    ['method' => 'GET', 'pattern' => '/auth/session', 'handler' => [AuthController::class, 'session']],

    // Public
    ['method' => 'GET', 'pattern' => '/sitemap.xml', 'handler' => [SitemapController::class, 'show']],
    ['method' => 'GET', 'pattern' => '/institution', 'handler' => [InstitutionController::class, 'show']],
    ['method' => 'PUT', 'pattern' => '/cms/institution', 'handler' => [InstitutionController::class, 'cmsUpdate']],
    ['method' => 'GET', 'pattern' => '/pages', 'handler' => [PagesController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/pages/{slug}', 'handler' => [PagesController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/news', 'handler' => [NewsController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/news/{slug}', 'handler' => [NewsController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/events', 'handler' => [EventsController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/events/{slug}', 'handler' => [EventsController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/services', 'handler' => [ServicesController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/services/{slug}', 'handler' => [ServicesController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/documents', 'handler' => [DocumentsController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/documents/{slug}', 'handler' => [DocumentsController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/media/{file}', 'handler' => [MediaController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/departments', 'handler' => [DepartmentsController::class, 'publicList']],
    ['method' => 'GET', 'pattern' => '/departments/{slug}', 'handler' => [DepartmentsController::class, 'publicShow']],
    ['method' => 'GET', 'pattern' => '/leadership', 'handler' => [PeopleController::class, 'publicLeadership']],
    ['method' => 'GET', 'pattern' => '/people/{slug}', 'handler' => [PeopleController::class, 'publicShow']],

    // CMS — media
    ['method' => 'POST', 'pattern' => '/cms/media', 'handler' => [MediaController::class, 'cmsUpload']],

    // CMS — pages
    ['method' => 'GET', 'pattern' => '/cms/pages', 'handler' => [PagesController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/pages/{id}', 'handler' => [PagesController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/pages', 'handler' => [PagesController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/pages/{id}', 'handler' => [PagesController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/pages/{id}', 'handler' => [PagesController::class, 'cmsArchive']],

    // CMS — news
    ['method' => 'GET', 'pattern' => '/cms/news', 'handler' => [NewsController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/news/{id}', 'handler' => [NewsController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/news', 'handler' => [NewsController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/news/{id}', 'handler' => [NewsController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/news/{id}', 'handler' => [NewsController::class, 'cmsArchive']],

    // CMS — events
    ['method' => 'GET', 'pattern' => '/cms/events', 'handler' => [EventsController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/events/{id}', 'handler' => [EventsController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/events', 'handler' => [EventsController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/events/{id}', 'handler' => [EventsController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/events/{id}', 'handler' => [EventsController::class, 'cmsArchive']],

    // CMS — services
    ['method' => 'GET', 'pattern' => '/cms/services', 'handler' => [ServicesController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/services/{id}', 'handler' => [ServicesController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/services', 'handler' => [ServicesController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/services/{id}', 'handler' => [ServicesController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/services/{id}', 'handler' => [ServicesController::class, 'cmsArchive']],

    // CMS — documents
    ['method' => 'GET', 'pattern' => '/cms/documents', 'handler' => [DocumentsController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/documents/{id}', 'handler' => [DocumentsController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/documents', 'handler' => [DocumentsController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/documents/{id}', 'handler' => [DocumentsController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/documents/{id}', 'handler' => [DocumentsController::class, 'cmsArchive']],

    // CMS — organization
    ['method' => 'GET', 'pattern' => '/cms/departments', 'handler' => [DepartmentsController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/departments/{id}', 'handler' => [DepartmentsController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/departments', 'handler' => [DepartmentsController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/departments/{id}', 'handler' => [DepartmentsController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/departments/{id}', 'handler' => [DepartmentsController::class, 'cmsArchive']],
    ['method' => 'GET', 'pattern' => '/cms/people', 'handler' => [PeopleController::class, 'cmsList']],
    ['method' => 'GET', 'pattern' => '/cms/people/{id}', 'handler' => [PeopleController::class, 'cmsShow']],
    ['method' => 'POST', 'pattern' => '/cms/people', 'handler' => [PeopleController::class, 'cmsCreate']],
    ['method' => 'PUT', 'pattern' => '/cms/people/{id}', 'handler' => [PeopleController::class, 'cmsUpdate']],
    ['method' => 'DELETE', 'pattern' => '/cms/people/{id}', 'handler' => [PeopleController::class, 'cmsArchive']],

    // CMS — users
    ['method' => 'GET', 'pattern' => '/cms/users', 'handler' => [UsersController::class, 'cmsList']],
    ['method' => 'PUT', 'pattern' => '/cms/users/{id}', 'handler' => [UsersController::class, 'cmsUpdate']],
];
