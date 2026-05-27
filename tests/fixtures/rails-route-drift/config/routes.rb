Rails.application.routes.draw do
  get "/health", to: "health#show"

  scope "/api" do
    post "/users", to: "users#create"
  end
end
