import { expect, test } from "@playwright/test";

/**
 * Saude de cada tela, nos dois aparelhos:
 *
 *   - nenhum erro de JavaScript e nenhuma violacao da CSP no console (a
 *     politica e restrita; um recurso de fora bloqueado so aparece aqui);
 *   - nenhuma rolagem horizontal -- o defeito de layout mais comum no
 *     celular, e invisivel em teste de unidade;
 *   - um titulo de nivel 1 por tela.
 */

const TELAS = [
  "/",
  "/explorar",
  "/rota/GRU/LIS",
  "/carteira",
  "/objetivos",
  "/oportunidades",
  "/aprender",
  "/nao-existe",
];

for (const caminho of TELAS) {
  test(`saude de ${caminho}`, async ({ page }) => {
    const problemas: string[] = [];
    page.on("pageerror", (e) => problemas.push(`erro de pagina: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" || /Content Security Policy/i.test(m.text())) {
        // 404 do proprio /nao-existe nao e defeito
        if (caminho === "/nao-existe" && /404/.test(m.text())) return;
        problemas.push(`console: ${m.text()}`);
      }
    });

    await page.goto(caminho);
    await page.waitForLoadState("networkidle");

    expect(problemas).toEqual([]);

    const largura = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      janela: window.innerWidth,
    }));
    expect(largura.pagina, "rolagem horizontal").toBeLessThanOrEqual(largura.janela);

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

test("relato de erro do navegador e aceito, e lixo e recusado", async ({ request }) => {
  const valido = await request.post("/api/erros", {
    data: { origem: "janela", mensagem: "teste de jornada", pagina: "/", dispositivo: "desktop", largura: 1440 },
  });
  expect(valido.status()).toBe(204);

  const invalido = await request.post("/api/erros", {
    data: { origem: "janela", mensagem: "x", pagina: "/?email=a@b.c", dispositivo: "desktop", largura: 1 },
  });
  expect(invalido.status()).toBe(400);
});
