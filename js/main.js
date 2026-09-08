/**
 * ============================================================================
 * Starship Arena - Entry Point Bootstrap (main.js)
 * ============================================================================
 * Description:
 *   Application bootstrap script. Instantiates the global Game coordinator
 *   instance once the HTML DOM is fully parsed and ready for execution.
 * ============================================================================
 */

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
