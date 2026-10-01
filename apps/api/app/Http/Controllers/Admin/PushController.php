<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PushAudienceRequest;
use App\Http\Requests\Admin\PushCampaignRequest;
use App\Models\Admin;
use App\Models\PushCampaign;
use App\Services\Push\PushAudience;
use App\Services\Push\PushCampaigns;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The panel's Push bildirimi page — an owner's: who a filter picks, and pushes to them. */
class PushController extends Controller
{
    public function __construct(private readonly PushCampaigns $campaigns) {}

    /** `GET /admin/push/campaigns` — the latest twenty, newest first. */
    public function index(): JsonResponse
    {
        $campaigns = PushCampaign::query()->orderByDesc('id')->limit(20)->get();

        return response()->json(['campaigns' => $campaigns->map($this->campaigns->present(...))->values()->all()]);
    }

    /** `POST /admin/push/audience` — how many the filters pick; changes nothing. */
    public function audience(PushAudienceRequest $request, PushAudience $audience): JsonResponse
    {
        return response()->json($audience->count($request->filters()));
    }

    /** `POST /admin/push/campaigns` — writes the campaign; the steps send it. */
    public function store(PushCampaignRequest $request, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $campaign = $this->campaigns->start($request->words(), $request->fallback(), $request->filters(), Actor::panel($admin, $request));

        return response()->json(['campaign' => $this->campaigns->present($campaign)], 201);
    }

    /** `POST /admin/push/campaigns/{id}/step` — the next batch of phones. */
    public function step(int $campaign): JsonResponse
    {
        return response()->json(['campaign' => $this->campaigns->present($this->campaigns->step(PushCampaign::query()->findOrFail($campaign)))]);
    }

    /** `POST /admin/push/campaigns/{id}/stop` — no more batches. */
    public function stop(Request $request, int $campaign, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $stopped = $this->campaigns->stop(PushCampaign::query()->findOrFail($campaign), Actor::panel($admin, $request));

        return response()->json(['campaign' => $this->campaigns->present($stopped)]);
    }
}
