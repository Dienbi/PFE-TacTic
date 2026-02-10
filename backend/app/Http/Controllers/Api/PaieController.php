<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaieRequest;
use App\Services\PaieService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaieController extends Controller
{
    public function __construct(
        protected PaieService $paieService
    ) {}

    /**
     * Get all payrolls (RH)
     */
    public function index(): JsonResponse
    {
        return response()->json($this->paieService->getAll());
    }

    /**
     * Get payroll by ID (RH)
     */
    public function show(int $id): JsonResponse
    {
        $paie = $this->paieService->getById($id);

        if (!$paie) {
            return response()->json(['message' => 'Paie non trouvée.'], 404);
        }

        return response()->json($paie);
    }

    /**
     * Get payrolls for current user
     */
    public function mesPaies(Request $request): JsonResponse
    {
        return response()->json(
            $this->paieService->getByUtilisateur($request->user()->id)
        );
    }

    /**
     * Get payrolls by user ID (RH)
     */
    public function byUtilisateur(int $utilisateurId): JsonResponse
    {
        return response()->json(
            $this->paieService->getByUtilisateur($utilisateurId)
        );
    }

    // ── Salary Configuration ──────────────────────────────────────────

    /**
     * Get all employees with salary config info (RH)
     */
    public function employeesConfig(): JsonResponse
    {
        return response()->json(
            $this->paieService->getEmployeesWithSalaryConfig()
        );
    }

    /**
     * Configure employee salary (RH)
     */
    public function configurerSalaire(Request $request): JsonResponse
    {
        $request->validate([
            'utilisateur_id' => 'required|exists:utilisateurs,id',
            'salaire_base' => 'required|numeric|min:0',
        ], [
            'utilisateur_id.required' => 'L\'employé est obligatoire.',
            'salaire_base.required' => 'Le salaire de base est obligatoire.',
            'salaire_base.min' => 'Le salaire de base doit être positif.',
        ]);

        $result = $this->paieService->configurerSalaire(
            $request->utilisateur_id,
            $request->salaire_base
        );

        return response()->json([
            'message' => 'Salaire configuré avec succès.',
            'data' => $result,
        ]);
    }

    /**
     * Simulate payroll calculation (RH)
     */
    public function simuler(Request $request): JsonResponse
    {
        $request->validate([
            'salaire_base' => 'required|numeric|min:0',
            'heures_supp' => 'numeric|min:0',
        ]);

        $result = $this->paieService->simuler(
            $request->salaire_base,
            $request->heures_supp ?? 0
        );

        return response()->json($result);
    }

    /**
     * Preview payroll for a specific employee and period (RH)
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'utilisateur_id' => 'required|exists:utilisateurs,id',
            'periode_debut' => 'required|date',
            'periode_fin' => 'required|date|after:periode_debut',
        ]);

        $result = $this->paieService->previewPaie(
            $request->utilisateur_id,
            Carbon::parse($request->periode_debut),
            Carbon::parse($request->periode_fin)
        );

        return response()->json($result);
    }

    // ── Payroll Generation ────────────────────────────────────────────

    /**
     * Generate payroll for a specific employee (RH)
     */
    public function generer(PaieRequest $request): JsonResponse
    {
        $result = $this->paieService->generer(
            $request->utilisateur_id,
            Carbon::parse($request->periode_debut),
            Carbon::parse($request->periode_fin)
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Generate payrolls for all active employees (RH)
     */
    public function genererPourTous(Request $request): JsonResponse
    {
        $request->validate([
            'periode_debut' => 'required|date',
            'periode_fin' => 'required|date|after:periode_debut',
        ]);

        $results = $this->paieService->genererPourTous(
            Carbon::parse($request->periode_debut),
            Carbon::parse($request->periode_fin)
        );

        return response()->json($results, 201);
    }

    // ── Workflow ───────────────────────────────────────────────────────

    /**
     * Validate a payroll (RH)
     */
    public function valider(int $id): JsonResponse
    {
        $this->paieService->valider($id);
        return response()->json(['message' => 'Paie validée.']);
    }

    /**
     * Mark payroll as paid (RH)
     */
    public function marquerPayee(int $id): JsonResponse
    {
        $this->paieService->marquerPayee($id);
        return response()->json(['message' => 'Paie marquée comme payée.']);
    }

    // ── Queries ───────────────────────────────────────────────────────

    /**
     * Get unpaid payrolls (RH)
     */
    public function nonPayees(): JsonResponse
    {
        return response()->json($this->paieService->getNonPayees());
    }

    // ── Statistics ────────────────────────────────────────────────────

    /**
     * Get personal or specific user's payroll stats
     */
    public function stats(Request $request): JsonResponse
    {
        $utilisateurId = $request->get('utilisateur_id', $request->user()->id);
        return response()->json($this->paieService->getStats($utilisateurId));
    }

    /**
     * Get global payroll statistics (RH)
     */
    public function globalStats(): JsonResponse
    {
        return response()->json($this->paieService->getGlobalStats());
    }

    /**
     * Get total salaries for a month (RH)
     */
    public function totalMensuel(Request $request): JsonResponse
    {
        $year = $request->get('year', Carbon::now()->year);
        $month = $request->get('month', Carbon::now()->month);

        return response()->json([
            'year' => $year,
            'month' => $month,
            'total' => $this->paieService->getTotalSalaires($year, $month),
        ]);
    }

    /**
     * Get team payroll summary (Manager)
     */
    public function teamPayroll(Request $request): JsonResponse
    {
        $result = $this->paieService->getTeamPayroll($request->user()->id);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json($result);
    }

    /**
     * Update payroll (RH)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->paieService->update($id, $request->all());
        return response()->json(['message' => 'Paie mise à jour.']);
    }

    /**
     * Delete payroll (RH)
     */
    public function destroy(int $id): JsonResponse
    {
        $this->paieService->delete($id);
        return response()->json(['message' => 'Paie supprimée.']);
    }

    /**
     * Download the payslip as a PDF/View (RH & User)
     */
    public function download(int $id)
    {
        // This will return an HTML view which can be printed to PDF by the browser.
        // For a more robust PDF generation, we could use dompdf or snappy.
        // But for this requirement, a print-friendly view is efficient.

        $paie = $this->paieService->getById($id);

        if (!$paie) {
            abort(404, 'Paie non trouvée.');
        }

        // Ensure user can only download their own payslip or have RH permission
        $user = request()->user();
        if ($user->id !== $paie->utilisateur_id && !$user->hasRole('admin') && !$user->hasRole('rh')) {
            abort(403, 'Accès interdit.');
        }

        return view('paie.bulletin', ['paie' => $paie]);
    }

    /**
     * Increase all salaries by a percentage (RH)
     */
    public function increaseSalaries(Request $request): JsonResponse
    {
        $request->validate([
            'percentage' => 'required|numeric|min:0.01',
        ], [
            'percentage.required' => 'Le pourcentage est obligatoire.',
            'percentage.min' => 'Le pourcentage doit être supérieur à 0.',
        ]);

        $count = $this->paieService->augmenterSalaires($request->percentage);

        return response()->json([
            'message' => "Salaires augmentés pour {$count} employés avec succès.",
            'count' => $count
        ]);
    }
}
