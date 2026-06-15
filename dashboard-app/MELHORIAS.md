# Pontos de Melhoria - Aplicação de Notas Fiscais

Este documento registra as sugestões de melhoria arquitetural, performance, segurança e manutenção para a aplicação de gestão de notas fiscais.

## 1. Arquitetura e Manutenibilidade
- [ ] **Centralização da Lógica de Negócios:** Mover a lógica de domínio (cálculos, regras complexas) da pasta `app/` e `lib/` para uma nova pasta `domain/` ou `services/`.
- [ ] **Abstração do Banco de Dados:** Avaliar a migração de SQL *raw* em `lib/db.ts` para um ORM (como Drizzle ou Prisma) para melhorar a segurança e *typesafety*.

## 2. Performance e Experiência do Usuário (UX)
- [ ] **Otimização de Queries:** Analisar queries críticas (ex: `getDashboardData`) com `explain analyze` no PostgreSQL para garantir eficiência dos índices.
- [ ] **Carregamento Granular:** Implementar `React Suspense` para carregamento de componentes de forma independente, evitando bloqueios na interface.

## 3. Segurança e Robustez
- [ ] **Validação de Entradas:** Adotar `zod` para validar rigorosamente todas as entradas das rotas de API (`app/api/...`).
- [ ] **Tratamento de Erros:** Centralizar o tratamento de erros em *error boundaries* globais ou *middleware* para evitar vazamento de *stack traces* e melhorar o log de erros em produção.

## 4. Redis (Cache)
- [ ] **Monitoramento de Chaves:** Implementar uma estrutura de dados no Redis (como `SETS`: `user:{id}:recipe_keys`) para facilitar auditoria e limpeza de cache por usuário.
- [ ] **Invalidação Proativa:** Criar gatilhos para limpar o cache de receitas automaticamente quando o usuário realizar o upload de uma nova nota fiscal.

## 5. Configuração e Dev Experience
- [ ] **Strict Types:** Ativar `strict: true` no `tsconfig.json` e eliminar usos de `any` no código.
- [ ] **Padronização de Singletons:** Refatorar a gestão de conexões globais (banco de dados/Redis) para padrões de *Singleton* mais robustos.

## 6. Internacionalização (i18n)
- [ ] **Implementar suporte a idiomas:** Adotar `next-intl` para suportar inglês (en) e preparar a estrutura para espanhol (es), migrando a estrutura de rotas para `app/[locale]/...`.
