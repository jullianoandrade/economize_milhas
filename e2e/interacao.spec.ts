import { expect, test } from "@playwright/test";

/**
 * Detalhes de interacao que fazem a interface parecer viva: a maozinha
 * em tudo que se clica e o globo que gira na mao.
 */

test("botoes, links e resumos mostram a maozinha", async ({ page }) => {
  await page.goto("/explorar");
  const cursor = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).cursor);

  expect(await cursor("button:not(:disabled)")).toBe("pointer");
  expect(await cursor("a[href]")).toBe("pointer");

  await page.goto("/rota/GRU/LIS");
  expect(await cursor("summary")).toBe("pointer");
});

test("o globo gira arrastando com o mouse", async ({ page, isMobile }) => {
  test.skip(isMobile, "arrastar com mouse e coisa de desktop; no toque, a horizontal gira");

  await page.goto("/explorar");
  // com uma rota escolhida o globo para de girar sozinho: qualquer
  // mudanca na imagem depois disso vem do arraste
  await page.getByRole("button", { name: "Lisboa" }).click();
  await expect(page.getByRole("region", { name: "Resposta" })).toContainText("Em dinheiro");
  await page.waitForTimeout(3000);

  const tela = page.locator("canvas").first();
  const antes = await tela.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const caixa = await tela.boundingBox();
  if (!caixa) throw new Error("globo sem caixa");

  // o centro do globo, no enquadramento "esquerda" da resposta
  const x = caixa.x + caixa.width * 0.32;
  const y = caixa.y + caixa.height * 0.54;
  await page.mouse.move(x, y);
  expect(await tela.evaluate((c: HTMLCanvasElement) => getComputedStyle(c).cursor)).toBe("grab");

  await page.mouse.down();
  await page.mouse.move(x + 140, y + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const depois = await tela.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(depois).not.toBe(antes);
});
