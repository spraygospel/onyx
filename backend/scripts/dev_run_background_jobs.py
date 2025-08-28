import os
import subprocess
import threading


def monitor_process(process_name: str, process: subprocess.Popen) -> None:
    assert process.stdout is not None

    while True:
        output = process.stdout.readline()

        if output:
            print(f"{process_name}: {output.strip()}")

        if process.poll() is not None:
            break


def run_jobs() -> None:
    # Load environment variables from .env.dev if exists
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.dev')
    if os.path.exists(env_path):
        print(f"Loading environment from: {env_path}")
        with open(env_path, 'r') as f:
            loaded_count = 0
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
                    loaded_count += 1
        print(f"✅ Loaded {loaded_count} environment variables")
        
        # Verify critical S3 variables are loaded
        s3_vars = ['S3_AWS_ACCESS_KEY_ID', 'S3_AWS_SECRET_ACCESS_KEY', 'S3_ENDPOINT_URL', 'S3_FILE_STORE_BUCKET_NAME']
        missing_vars = [var for var in s3_vars if not os.environ.get(var)]
        if missing_vars:
            print(f"❌ WARNING: Missing S3 variables: {missing_vars}")
        else:
            print("✅ All critical S3 environment variables loaded")
    else:
        print(f"⚠️  Environment file not found: {env_path}")
    
    # Get current environment with loaded variables
    current_env = os.environ.copy()
    
    # command setup
    cmd_worker_primary = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.primary",
        "worker",
        "--pool=threads",
        "--concurrency=6",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=primary@%n",
        "-Q",
        "celery",
    ]

    cmd_worker_light = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.light",
        "worker",
        "--pool=threads",
        "--concurrency=16",
        "--prefetch-multiplier=8",
        "--loglevel=INFO",
        "--hostname=light@%n",
        "-Q",
        "vespa_metadata_sync,connector_deletion,doc_permissions_upsert,checkpoint_cleanup",
    ]

    cmd_worker_heavy = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.heavy",
        "worker",
        "--pool=threads",
        "--concurrency=6",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=heavy@%n",
        "-Q",
        "connector_pruning,connector_doc_permissions_sync,connector_external_group_sync,csv_generation",
    ]

    cmd_worker_docprocessing = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.docprocessing",
        "worker",
        "--pool=threads",
        "--concurrency=6",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=docprocessing@%n",
        "--queues=docprocessing",
    ]

    cmd_worker_user_files_indexing = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.docfetching",
        "worker",
        "--pool=threads",
        "--concurrency=1",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=user_files_indexing@%n",
        "--queues=user_files_indexing",
    ]

    cmd_worker_monitoring = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.monitoring",
        "worker",
        "--pool=threads",
        "--concurrency=1",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=monitoring@%n",
        "--queues=monitoring",
    ]

    cmd_worker_kg_processing = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.kg_processing",
        "worker",
        "--pool=threads",
        "--concurrency=4",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=kg_processing@%n",
        "--queues=kg_processing",
    ]

    cmd_worker_docfetching = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.docfetching",
        "worker",
        "--pool=threads",
        "--concurrency=1",
        "--prefetch-multiplier=1",
        "--loglevel=INFO",
        "--hostname=docfetching@%n",
        "--queues=connector_doc_fetching,user_files_indexing",
    ]

    cmd_beat = [
        "celery",
        "-A",
        "onyx.background.celery.versioned_apps.beat",
        "beat",
        "--loglevel=INFO",
    ]

    # spawn processes with environment inheritance
    print("🚀 Starting Celery workers with environment inheritance...")
    
    worker_primary_process = subprocess.Popen(
        cmd_worker_primary, env=current_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    worker_light_process = subprocess.Popen(
        cmd_worker_light, env=current_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    worker_heavy_process = subprocess.Popen(
        cmd_worker_heavy, env=current_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    worker_docprocessing_process = subprocess.Popen(
        cmd_worker_docprocessing,
        env=current_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    worker_user_files_indexing_process = subprocess.Popen(
        cmd_worker_user_files_indexing,
        env=current_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    worker_monitoring_process = subprocess.Popen(
        cmd_worker_monitoring,
        env=current_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    worker_kg_processing_process = subprocess.Popen(
        cmd_worker_kg_processing,
        env=current_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    worker_docfetching_process = subprocess.Popen(
        cmd_worker_docfetching,
        env=current_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    beat_process = subprocess.Popen(
        cmd_beat, env=current_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    print("✅ All workers started with environment inheritance")

    # monitor threads
    worker_primary_thread = threading.Thread(
        target=monitor_process, args=("PRIMARY", worker_primary_process)
    )
    worker_light_thread = threading.Thread(
        target=monitor_process, args=("LIGHT", worker_light_process)
    )
    worker_heavy_thread = threading.Thread(
        target=monitor_process, args=("HEAVY", worker_heavy_process)
    )
    worker_docprocessing_thread = threading.Thread(
        target=monitor_process, args=("DOCPROCESSING", worker_docprocessing_process)
    )
    worker_user_files_indexing_thread = threading.Thread(
        target=monitor_process,
        args=("USER_FILES_INDEX", worker_user_files_indexing_process),
    )
    worker_monitoring_thread = threading.Thread(
        target=monitor_process, args=("MONITORING", worker_monitoring_process)
    )
    worker_kg_processing_thread = threading.Thread(
        target=monitor_process, args=("KG_PROCESSING", worker_kg_processing_process)
    )
    worker_docfetching_thread = threading.Thread(
        target=monitor_process, args=("DOCFETCHING", worker_docfetching_process)
    )
    beat_thread = threading.Thread(target=monitor_process, args=("BEAT", beat_process))

    worker_primary_thread.start()
    worker_light_thread.start()
    worker_heavy_thread.start()
    worker_docprocessing_thread.start()
    worker_user_files_indexing_thread.start()
    worker_monitoring_thread.start()
    worker_kg_processing_thread.start()
    worker_docfetching_thread.start()
    beat_thread.start()

    worker_primary_thread.join()
    worker_light_thread.join()
    worker_heavy_thread.join()
    worker_docprocessing_thread.join()
    worker_user_files_indexing_thread.join()
    worker_monitoring_thread.join()
    worker_kg_processing_thread.join()
    worker_docfetching_thread.join()
    beat_thread.join()


if __name__ == "__main__":
    run_jobs()
