import { expect, test } from "@playwright/test";

/**
 * A pergunta central do app: "vale milhas ou dinheiro para ir a X?".
 *
 * Os numeros dependem do preco do dia (Travelpayouts), entao o teste
 * confere a ESTRUTURA da resposta -- que ela chega, que diz de onde vem
 * cada numero, que leva ao detalhe -- e nao valores.
 */

test("Explorar: um toque no destino traz a resposta e leva ao detalhe da rota", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByRole("button", { name: "Lisboa" }).click();

  const resposta = page.getByRole("region", { name: "Resposta" });
  await expect(resposta).toContainText("Em dinheiro");
  await expect(resposta).toContainText(/Com milhas você economiza|Pague em dinheiro|Ainda não comparamos/);
  // todo numero com a origem dita: busca real ou estimativa
  await expect(resposta).toContainText(/busca real recente|preço estimado/);

  await resposta.getByRole("link", { name: "Ver mês, dia e todos os programas" }).click();
  await expect(page).toHaveURL(/\/rota\/[A-Z]{3}\/LIS$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lisboa");
});

test("Explorar: a busca por nome de cidade funciona", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByRole("combobox", { name: "Para onde você vai?" }).fill("Recife");
  await page.getByRole("option", { name: /Recife/ }).first().click();
  await expect(page.getByRole("region", { name: "Resposta" })).toContainText("Em dinheiro");
});

test("Rota: a resposta primeiro, o porque so quando pedido", async ({ page }) => {
  await page.goto("/rota/GRU/LIS");

  const placa = page.getByRole("region", { name: "A resposta" });
  await expect(placa).toContainText(/Com milhas você economiza|Pague em dinheiro|Ainda não comparamos/);
  await expect(placa).toContainText("Em dinheiro");

  const porque = page.locator("details", { has: page.getByText("Por que essa resposta?") });
  await expect(porque).not.toHaveAttribute("open", /.*/);
  await porque.getByText("Por que essa resposta?").click();
  await expect(porque).toHaveAttribute("open", /.*/);

  await expect(page.getByRole("heading", { name: "Quando ir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como pagar" })).toBeVisible();
});

test("Inicio: Explorar destinos leva a busca", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explorar destinos" }).click();
  await expect(page).toHaveURL(/\/explorar$/);
  await expect(page.getByRole("combobox", { name: "Para onde você vai?" })).toBeVisible();
});

test("Inicio: o Milo do topo leva a conta", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sua conta" }).first()).toHaveAttribute("href", "/conta");
});

test("Explorar: sair para resgatar fica em Minhas viagens", async ({ page, context }) => {
  // o site do programa abre em aba nova; aqui so importa o registro
  await context.route(/^https?:\/\/(?!localhost)/, (rota) => rota.abort());
  await page.goto("/explorar");
  for (const cidade of ["Lisboa", "Orlando", "Buenos Aires", "Santiago", "Recife"]) {
    const atalho = page.getByRole("button", { name: cidade });
    if (!(await atalho.isVisible())) continue;
    await atalho.click();
    const resposta = page.getByRole("region", { name: "Resposta" });
    await expect(resposta).toContainText("Em dinheiro");
    const resgatar = resposta.getByRole("link", { name: /^Resgatar no / });
    if (await resgatar.count()) {
      await resgatar.click();
      const viagens = await page.evaluate(() => JSON.parse(localStorage.getItem("voemilo-viagens") ?? "{}"));
      expect(viagens.state.viagens[0]).toMatchObject({ forma: "milhas", situacao: "em-vista", ida: null });
      return;
    }
    await resposta.getByRole("button", { name: "Fechar resposta" }).click();
  }
  test.skip(true, "nenhum atalho deu 'resgatar' com os precos de hoje");
});

test("Rota com data: todo preco leva a passagem daquele dia", async ({ page }) => {
  // Uma data sempre futura, para a rota nao cair na fase "passou".
  const ida = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.goto(`/rota/GRU/LIS?data=${ida}`);

  // O link para a passagem em dinheiro e sempre visivel, com ou sem
  // monetizacao, e abre em nova aba.
  const passagem = page.getByRole("link", { name: /^Ver passage(m|ns)/ }).first();
  await expect(passagem).toBeVisible();
  await expect(passagem).toHaveAttribute("target", "_blank");
  await expect(passagem).toHaveAttribute("href", /^https:\/\//);
  await expect(passagem).toContainText(/\d{1,2}\/[a-z]{3}/);

  // No celular a barra de abas e fixa: centraliza o botao, como a pessoa
  // faria rolando, para o toque nao cair na barra.
  await passagem.evaluate((el) => el.scrollIntoView({ block: "center" }));

  // O clique vira viagem "em vista" em Minhas viagens, neste aparelho.
  const [aba] = await Promise.all([page.context().waitForEvent("page"), passagem.click()]);
  await aba.close();
  const guardado = await page.evaluate(() => localStorage.getItem("voemilo-viagens") ?? "");
  expect(guardado).toContain('"destinoIata":"LIS"');
  expect(guardado).toContain(`"ida":"${ida}"`);
});
