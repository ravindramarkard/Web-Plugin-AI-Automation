pipeline {
    agent any

    environment {
        API_URL = 'http://localhost:3001/api'
        NODE_VERSION = '22'
        PNPM_VERSION = '9.15.1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                script {
                    // Install Node.js
                    sh '''
                        if ! command -v node &> /dev/null; then
                            echo "Installing Node.js ${NODE_VERSION}"
                            # Add your Node.js installation steps here
                        fi
                        
                        # Install pnpm
                        npm install -g pnpm@${PNPM_VERSION}
                        
                        # Install dependencies
                        pnpm install --frozen-lockfile
                    '''
                }
            }
        }

        stage('Start API Server') {
            steps {
                script {
                    // Start the API server in background
                    sh '''
                        cd server
                        pnpm install
                        pnpm dev &
                        echo $! > /tmp/api-server.pid
                        sleep 5  # Wait for server to start
                    '''
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    // Run tests based on parameters
                    def testCommand = ''
                    
                    if (params.SUITE_ID) {
                        testCommand = "node scripts/run-tests.js --suite ${params.SUITE_ID} --update-results"
                    } else if (params.PROJECT_ID) {
                        testCommand = "node scripts/run-tests.js --project ${params.PROJECT_ID} --update-results"
                    } else if (params.TEST_CASE_ID) {
                        testCommand = "node scripts/run-tests.js --test-case ${params.TEST_CASE_ID} --update-results"
                    } else {
                        testCommand = "node scripts/run-tests.js --all --update-results"
                    }
                    
                    sh """
                        chmod +x scripts/run-tests.js
                        ${testCommand} --api-url ${env.API_URL} --headless
                    """
                }
            }
        }

        stage('Publish Results') {
            steps {
                script {
                    // Publish Playwright HTML report
                    publishHTML([
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Test Report',
                        keepAll: true
                    ])
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    // Stop API server
                    sh '''
                        if [ -f /tmp/api-server.pid ]; then
                            kill $(cat /tmp/api-server.pid) || true
                            rm /tmp/api-server.pid
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            // Archive test results
            archiveArtifacts artifacts: 'tests/**/*.spec.ts', allowEmptyArchive: true
            archiveArtifacts artifacts: 'playwright-report/**/*', allowEmptyArchive: true
        }
        failure {
            emailext (
                subject: "Test Execution Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Test execution failed. Check the build logs for details.",
                to: "${env.CHANGE_AUTHOR_EMAIL ?: 'devops@example.com'}"
            )
        }
    }

    parameters {
        choice(
            name: 'TEST_SCOPE',
            choices: ['SUITE', 'PROJECT', 'TEST_CASE', 'ALL'],
            description: 'What to test'
        )
        string(
            name: 'SUITE_ID',
            defaultValue: '',
            description: 'Test Suite ID (if TEST_SCOPE is SUITE)'
        )
        string(
            name: 'PROJECT_ID',
            defaultValue: '',
            description: 'Project ID (if TEST_SCOPE is PROJECT)'
        )
        string(
            name: 'TEST_CASE_ID',
            defaultValue: '',
            description: 'Test Case ID (if TEST_SCOPE is TEST_CASE)'
        )
    }
}

