<?php

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    #[Route('/health', methods: ['GET'])]
    public function show(): Response {}
}

#[Route('/api')]
final class UserController
{
    #[Route('/users', methods: ['POST'])]
    public function store(): Response {}
}
