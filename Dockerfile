# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы проекта
COPY server.py .
COPY ip_addresses.csv .
COPY static/ ./static/

# Устанавливаем зависимости
RUN pip install flask requests flask-cors

# Указываем команду для запуска Flask-сервера
CMD ["python3", "server.py"]