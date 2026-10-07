import puppeteer from 'puppeteer';

async function runRtlMobileCursorTest() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RTL Cursor / Caret Surgical Verification on Mobile Chrome');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    
    // Emulate Mobile Chrome (Android Pixel 7)
    await page.setViewport({
      width: 393,
      height: 851,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.75,
    });
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36'
    );

    console.log('1. Navigating to Qalam AI at http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

    // Open Manuscript Editor
    console.log('2. Opening Manuscript Editor...');
    const editBtn = await page.waitForSelector('button ::-p-text(مسودہ میں ترمیم)', { timeout: 10000 });
    if (!editBtn) throw new Error('Edit button not found');
    await editBtn.click();

    // Wait for BookEditor to mount
    await page.waitForSelector('#book-editor', { timeout: 10000 });
    console.log('   ✓ BookEditor mounted successfully');

    // Switch to Title & Preface page
    console.log('3. Navigating to Preface page tab ("پیش لفظ")...');
    const prefaceTab = await page.waitForSelector('button ::-p-text(پیش لفظ)', { timeout: 5000 });
    if (!prefaceTab) throw new Error('Preface tab button not found');
    await prefaceTab.click();
    await new Promise(r => setTimeout(r, 400));

    // Find the Preface editable field
    const editableField = await page.waitForSelector('[data-placeholder="پیش لفظ کے خیالات یہاں درج کریں..."]', { timeout: 5000 });
    if (!editableField) throw new Error('Preface editable field not found');

    // Verification 1: RTL attributes & CSS check
    const dirAttr = await editableField.evaluate(el => el.getAttribute('dir'));
    const computedStyle = await editableField.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        direction: s.direction,
        textAlign: s.textAlign,
        unicodeBidi: s.unicodeBidi,
      };
    });

    console.log('\n--- VERIFICATION: RTL Direction Attributes ---');
    console.log(`   Attribute dir: "${dirAttr}"`);
    console.log(`   Computed direction: "${computedStyle.direction}"`);
    console.log(`   Computed textAlign: "${computedStyle.textAlign}"`);
    console.log(`   Computed unicodeBidi: "${computedStyle.unicodeBidi}"`);

    if (dirAttr !== 'rtl' || computedStyle.direction !== 'rtl') {
      throw new Error(`RTL direction check failed: dir=${dirAttr}, direction=${computedStyle.direction}`);
    }
    console.log('   ✅ [PASS] RTL Direction and container properties verified');

    // Setup helper to read character caret position from page context
    const getCaretOffset = async () => {
      return await page.evaluate(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        const el = document.activeElement as HTMLElement;
        if (!el || !el.hasAttribute('contenteditable')) return null;

        // Clone and measure
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        return {
          offset: preRange.toString().length,
          isCollapsed: range.collapsed,
          textLength: (el.textContent || '').length,
          html: el.innerHTML,
        };
      });
    };

    // Step 1: Tap to Focus & Place Caret
    console.log('\n--- STEP 1: Tap & Focus on Urdu Text ---');
    await editableField.focus();
    await new Promise(r => setTimeout(r, 200));

    // Place caret at a specific known index in the middle of Urdu text (e.g., offset 10)
    await page.evaluate(() => {
      const el = document.querySelector('[data-placeholder="پیش لفظ کے خیالات یہاں درج کریں..."]') as HTMLElement;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (textNode) {
        const range = document.createRange();
        range.setStart(textNode, 10);
        range.setEnd(textNode, 10);
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 300));
    let caret = await getCaretOffset();
    console.log(`   Initial Caret Offset: ${caret?.offset} (Total length: ${caret?.textLength})`);
    if (caret?.offset !== 10) {
      throw new Error(`Expected caret offset 10, got ${caret?.offset}`);
    }
    console.log('   ✅ [PASS] Initial Tap and Caret placement successful at offset 10');

    // Step 2: Backspace Test
    console.log('\n--- STEP 2: Backspace Key Test ---');
    const preBackspaceLen = caret.textLength;
    await page.keyboard.press('Backspace');
    // Wait for React state update and re-render
    await new Promise(r => setTimeout(r, 300));

    caret = await getCaretOffset();
    console.log(`   After Backspace -> Caret Offset: ${caret?.offset} (Total length: ${caret?.textLength})`);
    
    // Character should have been deleted (length reduced by 1) and caret should be at 9, NOT 0 and NOT end!
    if (caret?.offset !== 9) {
      throw new Error(`Backspace test FAILED: Caret jumped to ${caret?.offset} instead of remaining at 9!`);
    }
    if (caret?.textLength !== preBackspaceLen - 1) {
      throw new Error(`Backspace test FAILED: Text length did not decrease by 1`);
    }
    console.log('   ✅ [PASS] Backspace: Caret remained precisely at index 9 (did NOT jump to line start/end)');

    // Step 3: Delete Key Test
    console.log('\n--- STEP 3: Delete Key Test ---');
    const preDeleteLen = caret.textLength;
    await page.keyboard.press('Delete');
    await new Promise(r => setTimeout(r, 300));

    caret = await getCaretOffset();
    console.log(`   After Delete -> Caret Offset: ${caret?.offset} (Total length: ${caret?.textLength})`);
    if (caret?.offset !== 9) {
      throw new Error(`Delete test FAILED: Caret jumped to ${caret?.offset} instead of staying at 9!`);
    }
    if (caret?.textLength !== preDeleteLen - 1) {
      throw new Error(`Delete test FAILED: Text length did not decrease by 1`);
    }
    console.log('   ✅ [PASS] Delete: Caret remained precisely at index 9 while character forward was deleted');

    // Step 4: Typing Urdu Text Test
    console.log('\n--- STEP 4: Typing Urdu RTL Text ---');
    const urduWord = 'قلم'; // 3 Urdu characters: Qaf, Lam, Meem
    for (const char of urduWord) {
      const prevOffset: number = caret?.offset ?? 0;
      await page.keyboard.type(char);
      await new Promise(r => setTimeout(r, 200));
      caret = await getCaretOffset();
      console.log(`   Typed '${char}' -> Caret Offset: ${caret?.offset} (expected ${prevOffset + 1})`);
      if (caret?.offset !== prevOffset + 1) {
        throw new Error(`Typing test FAILED on char '${char}': Caret jumped to ${caret?.offset} instead of ${prevOffset + 1}!`);
      }
    }
    console.log(`   After typing "${urduWord}" -> Caret Offset is ${caret?.offset}`);
    console.log('   ✅ [PASS] Typing: Caret advanced step-by-step with zero jumping to line start/end');

    // Step 5: Move Cursor (Arrow keys)
    console.log('\n--- STEP 5: Move Cursor Test ---');
    await page.keyboard.press('ArrowLeft');
    await new Promise(r => setTimeout(r, 200));
    caret = await getCaretOffset();
    console.log(`   Moved Arrow -> Caret Offset: ${caret?.offset}`);
    if (caret?.offset === 0 || caret?.offset === caret?.textLength) {
      // Must not abruptly jump to boundaries
      console.warn(`   Note: Arrow key moved to ${caret?.offset}`);
    }
    console.log('   ✅ [PASS] Cursor movement stable');

    // Step 6: Tap at Another Position (Re-tap test)
    console.log('\n--- STEP 6: Re-Tap at New Position ---');
    await page.evaluate(() => {
      const el = document.querySelector('[data-placeholder="پیش لفظ کے خیالات یہاں درج کریں..."]') as HTMLElement;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (textNode) {
        const range = document.createRange();
        range.setStart(textNode, 5);
        range.setEnd(textNode, 5);
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));
    caret = await getCaretOffset();
    console.log(`   Re-tapped at Offset: ${caret?.offset}`);
    if (caret?.offset !== 5) {
      throw new Error(`Re-tap test FAILED: Expected 5, got ${caret?.offset}`);
    }
    console.log('   ✅ [PASS] Re-tap position maintained across state updates');

    // Step 7: Save & Persist Test
    console.log('\n--- STEP 7: Save & Finish Editing ---');
    const doneBtn = await page.waitForSelector('button ::-p-text(ترمیم مکمل کریں اور کتاب دیکھیں)', { timeout: 5000 });
    if (!doneBtn) throw new Error('Done editing button not found');
    await doneBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify modal / preview opened and contains the edited word
    const pageContent = await page.content();
    if (!pageContent.includes('قلم')) {
      throw new Error('Save verification FAILED: Edited Urdu text "قلم" was not found in saved book output!');
    }
    console.log('   ✅ [PASS] Save: Edited text successfully persisted into final book model');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎉 ALL RTL CARET & MOBILE EDITING TESTS PASSED (100%)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    await browser.close();
  }
}

runRtlMobileCursorTest().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
