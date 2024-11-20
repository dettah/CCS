from django.urls import path
from .views import evaluation_req, predict_churn, predict_list_churn


urlpatterns = [
    path('evaluate/', evaluation_req, name="evaluation" ),
    path("predict/", predict_churn, name='prediction' ),
    path('predict_list/', predict_list_churn, name='list_prediction' ),
    
]
