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

test("nenhuma tela fica mais larga que o celular", async ({ page, isMobile }) => {
  test.skip(!isMobile, "o estouro lateral so afasta a tela no celular");
  // Bug real: na rota com data a pagina chegou a 2358px num celular de
  // 412, e o toque em "Ver passagem" caia no lugar errado.
  const ida = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const url of ["/", "/explorar", `/rota/GRU/LIS?data=${ida}`, "/rota/GRU/FLN", "/carteira", "/objetivos", "/oportunidades", "/conta", "/conta/viagens", "/aprender"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const { largura, tela } = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      tela: document.documentElement.clientWidth,
    }));
    expect(largura, `${url} com ${largura}px numa tela de ${tela}px`).toBeLessThanOrEqual(tela);
  }
});

test("o tema padrao e o claro, mesmo com o aparelho no escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  // A escolha da pessoa continua valendo.
  await page.evaluate(() => localStorage.setItem("milhas-tema", "escuro"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "escuro");
});

test("o Milo do Inicio da uma dica com acao a cada toque", async ({ page }) => {
  await page.goto("/");
  const milo = page.getByRole("button", { name: "Ouvir uma dica do Milo" });
  await expect(milo).toBeVisible();
  await milo.click();

  const balao = page.getByRole("status").filter({ has: page.getByRole("button", { name: "Fechar a dica" }) });
  await expect(balao).toBeVisible();
  // toda dica termina numa acao que leva a algum lugar do app
  await expect(balao.getByRole("link")).toHaveAttribute("href", /^\//);

  const primeira = await balao.innerText();
  await page.getByRole("button", { name: "Outra dica do Milo" }).click();
  await expect(balao).not.toHaveText(primeira);

  await page.keyboard.press("Escape");
  await expect(balao).toBeHidden();
});
