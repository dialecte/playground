import type { DocumentProgress } from './workspace.types'

/**
 * One bar out of two levels: completed coarse steps, plus how far the running one got according
 * to its fine sub-progress. Clamped, because a plan may report more steps than it announced.
 */
export function computeProgressFraction(progress: DocumentProgress): number {
	if (progress.total <= 0) return 0

	const runningStepFraction =
		progress.step !== null && progress.step.total > 0
			? progress.step.current / progress.step.total
			: 0

	return Math.min(1, (progress.current + runningStepFraction) / progress.total)
}
