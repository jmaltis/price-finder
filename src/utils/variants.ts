import type { VariantGroup } from '../types/pipeline.js';

interface Evaluable {
  evaluate<T>(fn: () => T): Promise<T>;
}

/**
 * Extraction générique des variantes produit via le DOM.
 * Détecte les swatches/options et leur disponibilité sans LLM.
 * Fonctionne avec Playwright Page et Stagehand Page (tout objet avec evaluate()).
 *
 * Patterns supportés :
 * 1. radiogroup + aria-disabled / class unselectable|disabled|out-of-stock
 * 2. select dropdowns avec option[disabled]
 * 3. data-attr based swatches (Shopify, etc.)
 * 4. input[type="radio"] avec label[for] (Nike, sites React modernes)
 */
export async function extractVariantsFromPage(page: Evaluable): Promise<VariantGroup[]> {
  return page.evaluate(() => {
    const groups: { name: string; options: { value: string; available: boolean; selected: boolean }[] }[] = [];
    const seen = new Set<string>();

    // Pattern 1: radiogroup avec swatches (Saucony, Nike, etc.)
    const radioGroups = document.querySelectorAll('[role="radiogroup"]');
    for (const group of radioGroups) {
      const label = group.getAttribute('aria-label') || '';
      if (!label || label.toLowerCase().includes('nav')) continue;

      const items = group.querySelectorAll('li');
      if (items.length === 0) continue;

      const options: { value: string; available: boolean; selected: boolean }[] = [];
      for (const item of items) {
        const labelEl = item.querySelector('label, [role="radio"]');
        const value = labelEl?.getAttribute('data-value')
          || item.getAttribute('data-value')
          || item.textContent?.trim()
          || '';
        if (!value) continue;

        const isDisabled =
          labelEl?.getAttribute('aria-disabled') === 'true' ||
          item.getAttribute('aria-disabled') === 'true' ||
          item.classList.contains('unselectable') ||
          item.classList.contains('disabled') ||
          item.classList.contains('out-of-stock') ||
          item.classList.contains('sold-out') ||
          item.classList.contains('unavailable') ||
          (item.querySelector('button, a, label') as HTMLElement)?.hasAttribute('disabled') ||
          false;

        const isSelected =
          item.classList.contains('selected') ||
          labelEl?.getAttribute('aria-checked') === 'true' ||
          item.getAttribute('aria-selected') === 'true' ||
          false;

        options.push({ value, available: !isDisabled, selected: isSelected });
      }

      if (options.length > 1) {
        const key = label.toLowerCase();
        if (seen.has(key)) {
          const existing = groups.find(g => g.name.toLowerCase() === key);
          if (existing && existing.options.length < options.length) {
            existing.options = options;
          }
        } else {
          seen.add(key);
          groups.push({ name: label, options });
        }
      }
    }

    // Pattern 2: select dropdowns
    const selects = document.querySelectorAll(
      'select[name*="size"], select[name*="color"], select[name*="variant"], select[data-attr*="size"], select[data-attr*="color"]'
    );
    for (const select of selects) {
      const name = select.getAttribute('aria-label') || select.getAttribute('name') || 'Option';
      const opts = select.querySelectorAll('option');
      const options: { value: string; available: boolean; selected: boolean }[] = [];

      for (const opt of opts) {
        const value = opt.value || opt.textContent?.trim() || '';
        if (!value || (opt.disabled && !opt.value)) continue;

        const isDisabled = opt.disabled ||
          opt.classList.contains('out-of-stock') ||
          (opt.textContent?.includes('indisponible') ?? false) ||
          (opt.textContent?.includes('out of stock') ?? false);

        options.push({ value, available: !isDisabled, selected: opt.selected });
      }

      if (options.length > 0) {
        groups.push({ name, options });
      }
    }

    // Pattern 3: input[type="radio"] avec label[for] (Nike, sites React)
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const radioByName = new Map<string, HTMLInputElement[]>();
    for (const r of radioInputs) {
      const input = r as HTMLInputElement;
      const name = input.name;
      if (!name) continue;
      if (!radioByName.has(name)) radioByName.set(name, []);
      radioByName.get(name)!.push(input);
    }

    for (const [name, inputs] of radioByName) {
      // Skip small groups (< 3 options) and thumbnail/image selectors
      if (inputs.length < 3) continue;
      if (name.toLowerCase().includes('thumbnail')) continue;

      const options: { value: string; available: boolean; selected: boolean }[] = [];
      let hasLabel = false;

      for (const input of inputs) {
        const label = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
        const labelText = label?.textContent?.trim() || '';
        const value = labelText || input.value || '';
        if (!value) continue;
        if (label) hasLabel = true;

        const isDisabled =
          input.disabled ||
          input.getAttribute('aria-disabled') === 'true' ||
          input.parentElement?.classList.contains('disabled') ||
          input.parentElement?.classList.contains('unavailable') ||
          input.parentElement?.classList.contains('out-of-stock') ||
          false;

        const isSelected = input.checked;
        options.push({ value, available: !isDisabled, selected: isSelected });
      }

      // Only add if we found meaningful labels (not just UUIDs)
      if (options.length >= 3 && hasLabel) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          // Infer group name from the input name or first label prefix
          const groupName = options[0].value.startsWith('EU ') ? 'Taille' :
            name.replace(/-/g, ' ').replace(/selector|input|grid/gi, '').trim() || 'Option';
          groups.push({ name: groupName, options });
        }
      }
    }

    // Pattern 4: boutons de taille dans un conteneur (Uniqlo, sites React/Vue modernes)
    if (groups.length === 0) {
      const sizeRegex = /^(\d{1,3}([.,]\d)?|XXS|XS|S|M|L|XL|XXL|XXXL|ONE SIZE)$/i;
      const sizeContainers = document.querySelectorAll(
        '[class*="size-chip"], [class*="size-selector"], [class*="size-list"], [class*="size-grid"], ' +
        '[class*="size-picker"], [class*="taille"], [class*="SizeSelector"], [data-testid*="size"]'
      );

      // Collect all containers that have size-text buttons
      let bestContainer: Element | null = null;
      let bestCount = 0;

      // Also try parent of first size button
      const allButtons = document.querySelectorAll('button, label, a');
      const sizeButtonParents = new Map<Element, Element[]>();
      for (const btn of allButtons) {
        const text = btn.textContent?.trim() || '';
        if (sizeRegex.test(text) && btn.parentElement) {
          // Go up to find the common container (parent or grandparent)
          const container = btn.parentElement.parentElement || btn.parentElement;
          if (!sizeButtonParents.has(container)) sizeButtonParents.set(container, []);
          sizeButtonParents.get(container)!.push(btn);
        }
      }

      // Find the container with the most size buttons
      for (const [container, buttons] of sizeButtonParents) {
        if (buttons.length > bestCount) {
          bestCount = buttons.length;
          bestContainer = container;
        }
      }

      // Also check explicit size containers
      for (const container of sizeContainers) {
        const buttons = container.querySelectorAll('button, label, a');
        let count = 0;
        for (const btn of buttons) {
          if (sizeRegex.test(btn.textContent?.trim() || '')) count++;
        }
        if (count > bestCount) {
          bestCount = count;
          bestContainer = container;
        }
      }

      if (bestContainer && bestCount >= 3) {
        const buttons = bestContainer.querySelectorAll('button, label, a');
        const options: { value: string; available: boolean; selected: boolean }[] = [];

        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          if (!sizeRegex.test(text)) continue;

          const isDisabled =
            btn.hasAttribute('disabled') ||
            btn.getAttribute('aria-disabled') === 'true' ||
            btn.classList.contains('disabled') ||
            btn.classList.contains('unavailable') ||
            btn.classList.contains('sold-out') ||
            btn.classList.contains('out-of-stock') ||
            btn.parentElement?.classList.contains('disabled') ||
            btn.parentElement?.classList.contains('unavailable') ||
            false;

          const isSelected =
            btn.classList.contains('selected') ||
            btn.classList.contains('active') ||
            btn.getAttribute('aria-pressed') === 'true' ||
            btn.getAttribute('aria-checked') === 'true' ||
            btn.parentElement?.classList.contains('selected') ||
            btn.parentElement?.className.includes('selected') ||
            false;

          options.push({ value: text, available: !isDisabled, selected: isSelected });
        }

        if (options.length >= 3) {
          groups.push({ name: 'Taille', options });
        }
      }
    }

    // Pattern 5: data-attr swatches (Shopify, etc.)
    if (groups.length === 0) {
      const swatchContainers = document.querySelectorAll(
        '[data-option-index], [class*="swatch"][class*="container"], [class*="variant-picker"]'
      );
      for (const container of swatchContainers) {
        const name = container.getAttribute('data-option-name')
          || container.querySelector('.option-label, .variant-label')?.textContent?.trim()
          || 'Option';

        const buttons = container.querySelectorAll('button, label, a');
        const options: { value: string; available: boolean; selected: boolean }[] = [];

        for (const btn of buttons) {
          const value = btn.getAttribute('data-value')
            || btn.getAttribute('aria-label')
            || btn.textContent?.trim()
            || '';
          if (!value) continue;

          const isDisabled =
            btn.hasAttribute('disabled') ||
            btn.getAttribute('aria-disabled') === 'true' ||
            btn.classList.contains('disabled') ||
            btn.classList.contains('sold-out') ||
            btn.classList.contains('unavailable') ||
            false;

          const isSelected =
            btn.classList.contains('active') ||
            btn.classList.contains('selected') ||
            btn.getAttribute('aria-checked') === 'true' ||
            false;

          options.push({ value, available: !isDisabled, selected: isSelected });
        }

        if (options.length > 0) {
          groups.push({ name, options });
        }
      }
    }

    return groups;
  });
}
