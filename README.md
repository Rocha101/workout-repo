# Workout Tracker

Um aplicativo moderno para acompanhamento de treinos construído com React Native e Node.js, projetado para ajudar os usuários a gerenciar suas rotinas de exercícios de forma eficiente.

## Funcionalidades

- **Autenticação de Usuário**
  - Cadastro e login seguros
  - Autenticação baseada em JWT
  - Criptografia de senha

- **Gerenciamento de Treinos**
  - Crie e personalize rotinas de treino
  - Acompanhe séries, repetições e pesos
  - Adicione notas e acompanhe o progresso
  - Agende treinos (diários ou semanais)

- **Acompanhamento de Progresso**
  - Registre exercícios concluídos
  - Acompanhe a progressão de peso e repetições
  - Visualize o histórico de treinos

## Tecnologias Utilizadas

### Aplicativo Móvel
- React Native com Expo
- TypeScript
- React Navigation
- Axios para comunicação com API
- Async Storage para persistência local de dados
- Sistema de temas personalizado

### Backend
- Node.js com Express
- TypeScript
- Prisma ORM
- Banco de dados SQLite
- JWT para autenticação
- Zod para validação
- bcrypt para hash de senhas

## Estrutura do Projeto

```
workout-repo/
├── apps/
│   ├── api/             # Servidor backend
│   │   ├── prisma/      # Schema e migrações do banco
│   │   └── src/         # Código fonte do servidor
│   └── mobile/          # App React Native
│       ├── app/         # Telas e navegação
│       ├── components/  # Componentes reutilizáveis
│       ├── contexts/    # Contextos React
│       └── services/    # Serviços de API
└── packages/           # Pacotes compartilhados
```

## Começando

### Pré-requisitos
- Node.js (v16 ou superior)
- Gerenciador de pacotes pnpm
- Expo CLI
- Android Studio (para desenvolvimento Android)
- Xcode (para desenvolvimento iOS, apenas macOS)

### Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositório]
cd workout-repo
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure o backend:
```bash
cd apps/api
cp .env.example .env  # Configure suas variáveis de ambiente
npx prisma migrate dev
npm run dev
```

4. Inicie o aplicativo móvel:
```bash
cd apps/mobile
npm run start
```

## Variáveis de Ambiente

### Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua-chave-secreta"
```

## Funcionalidades do App

- Interface limpa e intuitiva
- Suporte a tema claro/escuro
- Funcionalidade offline
- Validação em tempo real
- Animações suaves
- Tratamento e feedback de erros

## Recursos de Segurança

- Hash de senha com bcrypt
- Autenticação baseada em JWT
- Validação de entrada com Zod
- Armazenamento seguro de dados sensíveis
- Endpoints de API protegidos

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Autores

- Eduardo Rocha - Trabalho inicial

- Inspirado pela necessidade de uma solução simples e eficaz para acompanhamento de treinos
